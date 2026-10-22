-- Reshape "transactions" into one row per player movement (draft, add,
-- waiver claim, drop, trade). The previous columns were never written by any
-- importer, so the table holds no data worth keeping; clear it so the new
-- NOT NULL columns can be added.
DELETE FROM "transactions";

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'DRAFT';

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('PLATFORM_LOG', 'ROSTER_SNAPSHOT');

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "addedPlayer",
DROP COLUMN "droppedPlayer",
DROP COLUMN "teamId",
DROP COLUMN "tradeDetails",
ADD COLUMN     "draftPick" INTEGER,
ADD COLUMN     "draftRound" INTEGER,
ADD COLUMN     "fromTeamId" TEXT,
ADD COLUMN     "note" TEXT,
ADD COLUMN     "playerId" TEXT NOT NULL,
ADD COLUMN     "sequence" INTEGER NOT NULL,
ADD COLUMN     "source" "TransactionSource" NOT NULL DEFAULT 'PLATFORM_LOG',
ADD COLUMN     "toTeamId" TEXT,
ADD COLUMN     "tradeGroup" TEXT,
ADD COLUMN     "waiverBid" INTEGER,
ALTER COLUMN "processedAt" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "transactions_playerId_idx" ON "transactions"("playerId");

-- CreateIndex
CREATE INDEX "transactions_fromTeamId_idx" ON "transactions"("fromTeamId");

-- CreateIndex
CREATE INDEX "transactions_toTeamId_idx" ON "transactions"("toTeamId");

-- CreateIndex
CREATE INDEX "transactions_tradeGroup_idx" ON "transactions"("tradeGroup");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_seasonId_sequence_key" ON "transactions"("seasonId", "sequence");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_fromTeamId_fkey" FOREIGN KEY ("fromTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_toTeamId_fkey" FOREIGN KEY ("toTeamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
