import { PrismaClient, Platform } from '@prisma/client';
import { Redis } from 'ioredis';
import { config } from '../config.js';

export interface EnsureUserParams {
  userId: string;
  groupId: string;
  name?: string;
  platform?: Platform;
}

export class UserService {
  constructor(
    private prisma: PrismaClient,
    private redis?: Redis
  ) {}

  async ensureUserAndGroup(params: EnsureUserParams) {
    const { userId, groupId, name, platform = 'WHATSAPP' } = params;

    // Cache no Redis para evitar escritas repetidas no banco em rolls frequentes
    if (this.redis) {
      const cacheKey = `seen:${userId}:${groupId}`;
      const seen = await this.redis.get(cacheKey);
      if (seen && (!name || seen === name)) {
        return { cached: true };
      }
    }

    try {
      // 1. Upsert User
      const user = await this.prisma.user.upsert({
        where: { id: userId },
        create: {
          id: userId,
          name: name || userId,
          platform,
        },
        update: {
          ...(name ? { name } : {}),
        },
      });

      // 2. Upsert Group
      const group = await this.prisma.group.upsert({
        where: { id: groupId },
        create: {
          id: groupId,
          name: groupId === userId ? 'Privado' : `Grupo ${groupId}`,
          platform,
        },
        update: {},
      });

      // 3. Upsert UserGroup relationship
      await this.prisma.userGroup.upsert({
        where: {
          userId_groupId: {
            userId,
            groupId,
          },
        },
        create: {
          userId,
          groupId,
        },
        update: {},
      });

      if (this.redis) {
        await this.redis.set(`seen:${userId}:${groupId}`, name || '1', 'EX', 3600);
      }

      return { user, group };
    } catch (err: any) {
      if (err?.code === 'P2002') {
        // Concorrência no primeiro insert: outra requisição paralela já realizou o cadastro
        if (this.redis) {
          await this.redis.set(`seen:${userId}:${groupId}`, name || '1', 'EX', 3600);
        }
        return { cached: true };
      }
      throw err;
    }
  }

  async getUserProfile(userId: string) {
    const cleanUserId = userId.includes('@') ? userId.split('@')[0].split(':')[0] : userId;

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: cleanUserId }, { id: userId }],
      },
      include: {
        _count: {
          select: {
            harem: true,
            soulmates: true,
            wishlist: true,
          },
        },
        harem: {
          where: { isFavorite: true },
          take: 5,
          include: {
            character: true,
          },
        },
      },
    });

    if (!user) return null;

    // Busca personagens míticos que habitam o harém do usuário
    const mythicEntries = await this.prisma.haremEntry.findMany({
      where: {
        userId: user.id,
        character: { isMythic: true },
      },
      include: {
        character: true,
      },
      orderBy: { claimedAt: 'desc' },
    });

    const mythicCharacters = mythicEntries.map((e) => e.character);
    const mythicCount = mythicCharacters.length;

    // Calcula soulmates reais: registros na tabela soulmates + haremEntries com chaves >= 10 (excluindo míticos)
    const [soulmateRecords, highKeyEntries] = await Promise.all([
      this.prisma.soulmate.findMany({
        where: { userId: user.id },
        select: { characterId: true },
      }),
      this.prisma.haremEntry.findMany({
        where: {
          userId: user.id,
          keys: { gte: config.SOULMATE_KEYS_REQUIRED ?? 10 },
          character: { isMythic: false },
        },
        select: { characterId: true },
      }),
    ]);

    const distinctSoulmateIds = new Set([
      ...soulmateRecords.map((s) => s.characterId),
      ...highKeyEntries.map((h) => h.characterId),
    ]);
    const soulmateCount = distinctSoulmateIds.size;

    // Sincroniza em background na tabela soulmates caso haja personagens com 10+ chaves ainda não registrados
    const missingSoulmateCharIds = highKeyEntries
      .map((h) => h.characterId)
      .filter((charId) => !soulmateRecords.some((s) => s.characterId === charId));

    if (missingSoulmateCharIds.length > 0) {
      this.prisma.soulmate
        .createMany({
          data: missingSoulmateCharIds.map((charId) => ({
            userId: user.id,
            characterId: charId,
          })),
          skipDuplicates: true,
        })
        .catch(() => {});
    }

    const favoriteCharacters = user.harem
      .filter((h) => !h.character.isMythic)
      .map((h) => h.character);
    const favoriteCharacter = favoriteCharacters[0] ?? null;

    return {
      id: user.id,
      publicId: user.publicId,
      publicUrl: `${config.PUBLIC_BASE_URL}/user/${user.publicId}`,
      name: user.name,
      platform: user.platform,
      kakera: user.kakera,
      mythicSlots: user.mythicSlots,
      mythicCount,
      mythicCharacters,
      haremCount: user._count.harem,
      soulmateCount,
      wishlistCount: user._count.wishlist,
      favoriteCharacter,
      favoriteCharacters,
      createdAt: user.createdAt,
    };
  }

  async setFavoriteCharacter(userId: string, characterId: string) {
    const entry = await this.prisma.haremEntry.findUnique({
      where: {
        userId_characterId: {
          userId,
          characterId,
        },
      },
      include: { character: true },
    });

    if (!entry) {
      throw new Error('NOT_IN_HAREM');
    }

    if (entry.isFavorite) {
      return this.prisma.haremEntry.update({
        where: { id: entry.id },
        data: { isFavorite: false },
        include: { character: true },
      });
    }

    const currentCount = await this.prisma.haremEntry.count({
      where: { userId, isFavorite: true },
    });

    if (currentCount >= 5) {
      throw new Error('FAVORITES_LIMIT_REACHED');
    }

    return this.prisma.haremEntry.update({
      where: { id: entry.id },
      data: { isFavorite: true },
      include: { character: true },
    });
  }

  async updateUserName(userId: string, name: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name },
    });
  }

  async updateHaremName(userId: string, haremName: string | null) {
    const trimmed = haremName ? haremName.trim() : null;
    const finalName = trimmed && trimmed.length > 0 ? trimmed.substring(0, 20) : null;
    return this.prisma.user.update({
      where: { id: userId },
      data: { haremName: finalName },
    });
  }

  async updateHaremPrivacy(userId: string, isPrivate: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { haremPrivate: isPrivate },
    });
  }

  async getUserGroups(userId: string) {
    return this.prisma.userGroup.findMany({
      where: { userId },
      include: {
        group: true,
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async addMythicSlots(userId: string, amount: number, reason?: string) {
    if (amount <= 0) {
      throw new Error('INVALID_AMOUNT');
    }

    const cleanUserId = userId.includes('@') ? userId.split('@')[0].split(':')[0] : userId;

    const updatedUser = await this.prisma.user.upsert({
      where: { id: cleanUserId },
      create: {
        id: cleanUserId,
        name: cleanUserId,
        platform: 'WHATSAPP',
        mythicSlots: amount,
      },
      update: { mythicSlots: { increment: amount } },
      select: { id: true, name: true, mythicSlots: true },
    });

    const usedSlots = await this.prisma.character.count({
      where: { creatorUserId: cleanUserId, isMythic: true },
    });

    // Registra notificação para o usuário informando sobre os novos slots
    try {
      await this.prisma.userNotification.create({
        data: {
          userId: cleanUserId,
          type: 'SYSTEM',
          title: '🔮 Novo(s) Slot(s) de Mítico Liberado(s)!',
          message: `Você recebeu +${amount} slot(s) de criação mítica${reason ? ` (${reason})` : ''}. Acesse a aba Míticos para forjar sua lenda!`,
        },
      });
    } catch (_) {
      // Ignora falhas secundárias de notificação
    }

    return {
      userId: updatedUser.id,
      name: updatedUser.name,
      mythicSlots: updatedUser.mythicSlots,
      usedSlots,
      availableSlots: Math.max(0, updatedUser.mythicSlots - usedSlots),
    };
  }

  async getMythicSlots(userId: string) {
    const cleanUserId = userId.includes('@') ? userId.split('@')[0].split(':')[0] : userId;
    const user = await this.prisma.user.findUnique({
      where: { id: cleanUserId },
      select: { id: true, mythicSlots: true },
    });

    if (!user) return null;

    const usedSlots = await this.prisma.character.count({
      where: { creatorUserId: cleanUserId, isMythic: true },
    });

    return {
      userId: user.id,
      mythicSlots: user.mythicSlots,
      usedSlots,
      availableSlots: Math.max(0, user.mythicSlots - usedSlots),
    };
  }
}
