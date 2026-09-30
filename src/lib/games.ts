import { eq, asc, and, inArray, type SQL } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

/** Optional category and publisher constraints for a game listing query. */
export type GameFilters = {
    /** Return games in any of these categories when provided. */
    categoryIds?: number[];
    /** Return games from any of these publishers when provided. */
    publisherIds?: number[];
};

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/**
 * Builds the SQL condition for the provided category and publisher constraints.
 *
 * @param filters - Category and publisher IDs to include.
 * @returns The combined SQL condition, or undefined when no constraints are provided.
 */
function gameFilterCondition(filters: GameFilters): SQL | undefined {
    const categoryIds = filters.categoryIds ?? [];
    const publisherIds = filters.publisherIds ?? [];
    const clauses: SQL[] = [];

    if (categoryIds.length > 0) {
        clauses.push(inArray(games.categoryId, categoryIds));
    }

    if (publisherIds.length > 0) {
        clauses.push(inArray(games.publisherId, publisherIds));
    }

    return clauses.length > 0 ? and(...clauses) : undefined;
}

/**
 * Returns all categories ordered by name.
 *
 * @param db - The database connection to query.
 * @returns Categories with their IDs and names.
 */
export async function getAllCategories(db: Database): Promise<Array<{ id: number; name: string }>> {
    return db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));
}

/**
 * Returns all publishers ordered by name.
 *
 * @param db - The database connection to query.
 * @returns Publishers with their IDs and names.
 */
export async function getAllPublishers(db: Database): Promise<Array<{ id: number; name: string }>> {
    return db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
}

/**
 * Returns games ordered by title, optionally restricted by category and publisher.
 *
 * @param db - The database connection to query.
 * @param filters - Optional category and publisher IDs to include.
 * @returns Matching games ordered by title.
 */
export async function getAllGames(db: Database, filters: GameFilters = {}): Promise<Game[]> {
    const rows = await baseGamesQuery(db)
        .where(gameFilterCondition(filters))
        .orderBy(asc(games.title));
    return rows.map(mapGame);
}

/** All game ids ordered by title. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** A single game by id, or null when it does not exist. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
