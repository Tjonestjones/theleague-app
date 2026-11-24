-- CreateEnum
CREATE TYPE "RecapKind" AS ENUM ('WEEKLY', 'MANAGER_WEEKLY', 'SEASON_STORY', 'SEASON_WRAPPED');

-- CreateTable
CREATE TABLE "recaps" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "kind" "RecapKind" NOT NULL,
    "year" INTEGER NOT NULL,
    "week" INTEGER NOT NULL DEFAULT 0,
    "memberId" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "facts" JSONB NOT NULL,
    "writer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recaps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "recaps_leagueId_kind_year_week_memberId_key" ON "recaps"("leagueId", "kind", "year", "week", "memberId");

-- CreateIndex
CREATE INDEX "recaps_leagueId_year_idx" ON "recaps"("leagueId", "year");

-- AddForeignKey
ALTER TABLE "recaps" ADD CONSTRAINT "recaps_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
