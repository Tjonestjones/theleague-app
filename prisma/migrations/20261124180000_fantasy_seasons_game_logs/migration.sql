-- CreateTable
CREATE TABLE "player_fantasy_seasons" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "projectedPoints" DOUBLE PRECISION,
    "actualPoints" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_fantasy_seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_game_logs" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "team" TEXT,

    CONSTRAINT "player_game_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_fantasy_seasons_playerId_seasonId_key" ON "player_fantasy_seasons"("playerId", "seasonId");

-- CreateIndex
CREATE INDEX "player_fantasy_seasons_seasonId_idx" ON "player_fantasy_seasons"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "player_game_logs_playerId_season_week_key" ON "player_game_logs"("playerId", "season", "week");

-- CreateIndex
CREATE INDEX "player_game_logs_season_idx" ON "player_game_logs"("season");

-- AddForeignKey
ALTER TABLE "player_fantasy_seasons" ADD CONSTRAINT "player_fantasy_seasons_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_fantasy_seasons" ADD CONSTRAINT "player_fantasy_seasons_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_game_logs" ADD CONSTRAINT "player_game_logs_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
