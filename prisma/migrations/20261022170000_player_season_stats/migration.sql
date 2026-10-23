-- AlterTable
ALTER TABLE "players" ADD COLUMN     "gsisId" TEXT;

-- CreateTable
CREATE TABLE "player_season_stats" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "team" TEXT,
    "games" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "passingYards" INTEGER NOT NULL DEFAULT 0,
    "passingTds" INTEGER NOT NULL DEFAULT 0,
    "interceptions" INTEGER NOT NULL DEFAULT 0,
    "carries" INTEGER NOT NULL DEFAULT 0,
    "rushingYards" INTEGER NOT NULL DEFAULT 0,
    "rushingTds" INTEGER NOT NULL DEFAULT 0,
    "targets" INTEGER NOT NULL DEFAULT 0,
    "receptions" INTEGER NOT NULL DEFAULT 0,
    "receivingYards" INTEGER NOT NULL DEFAULT 0,
    "receivingTds" INTEGER NOT NULL DEFAULT 0,
    "fgMade" INTEGER NOT NULL DEFAULT 0,
    "fgAttempts" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_season_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "players_gsisId_key" ON "players"("gsisId");

-- CreateIndex
CREATE INDEX "player_season_stats_playerId_idx" ON "player_season_stats"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "player_season_stats_playerId_season_key" ON "player_season_stats"("playerId", "season");

-- AddForeignKey
ALTER TABLE "player_season_stats" ADD CONSTRAINT "player_season_stats_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
