import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
} from './games';

async function seedFilteredGames(db: Database): Promise<{
    strategyCategoryId: number;
    puzzleCategoryId: number;
    pubOneId: number;
    pubTwoId: number;
}> {
    const [strategyCategory] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [puzzleCategory] = await db
        .insert(categories)
        .values({ name: 'Puzzle', description: 'cat' })
        .returning({ id: categories.id });
    const [pubOne] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });
    const [pubTwo] = await db
        .insert(publishers)
        .values({ name: 'Pub Two', description: 'pub' })
        .returning({ id: publishers.id });

    const gameRows = [
        { title: 'Bravo', categoryId: strategyCategory.id, publisherId: pubTwo.id },
        { title: 'Alpha', categoryId: strategyCategory.id, publisherId: pubOne.id },
        { title: 'Delta', categoryId: puzzleCategory.id, publisherId: pubTwo.id },
        { title: 'Charlie', categoryId: puzzleCategory.id, publisherId: pubOne.id },
    ];

    for (const row of gameRows) {
        await db.insert(games).values({
            title: row.title,
            description: `Description ${row.title}`,
            starRating: 4.0,
            categoryId: row.categoryId,
            publisherId: row.publisherId,
        });
    }

    return {
        strategyCategoryId: strategyCategory.id,
        puzzleCategoryId: puzzleCategory.id,
        pubOneId: pubOne.id,
        pubTwoId: pubTwo.id,
    };
}

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters games by one or more category ids', async () => {
        const { strategyCategoryId, puzzleCategoryId } = await seedFilteredGames(db);

        const strategyOnly = await getAllGames(db, { categoryIds: [strategyCategoryId] });
        const multipleCategories = await getAllGames(db, {
            categoryIds: [strategyCategoryId, puzzleCategoryId],
        });

        expect(strategyOnly.map((game) => game.title)).toEqual(['Alpha', 'Bravo']);
        expect(multipleCategories.map((game) => game.title)).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    });

    it('filters games by publisher id and combines filters with category', async () => {
        const { strategyCategoryId, pubTwoId } = await seedFilteredGames(db);

        const byPublisher = await getAllGames(db, { publisherIds: [pubTwoId] });
        const combined = await getAllGames(db, {
            categoryIds: [strategyCategoryId],
            publisherIds: [pubTwoId],
        });

        expect(byPublisher.map((game) => game.title)).toEqual(['Bravo', 'Delta']);
        expect(combined.map((game) => game.title)).toEqual(['Bravo']);
    });
});
