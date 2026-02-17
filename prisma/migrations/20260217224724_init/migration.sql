-- CreateEnum
CREATE TYPE "Sport" AS ENUM ('NFL', 'NBA', 'MLB', 'NHL');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PRIVATE', 'UNLISTED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('COMMISSIONER', 'CO_COMMISSIONER', 'MEMBER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('SLEEPER', 'ESPN', 'YAHOO', 'FLEAFLICKER', 'MANUAL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MatchupStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DraftType" AS ENUM ('SNAKE', 'LINEAR', 'AUCTION');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('TRADE', 'ADD', 'DROP', 'WAIVER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'VETOED', 'CANCELED');

-- CreateEnum
CREATE TYPE "FinanceType" AS ENUM ('DUES', 'PAYOUT', 'FINE', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'WAIVED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leagues" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "sport" "Sport" NOT NULL DEFAULT 'NFL',
    "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invites" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "platformId" TEXT,
    "platform" "Platform",
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "numTeams" INTEGER NOT NULL,
    "playoffStartWeek" INTEGER,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT,
    "logoUrl" TEXT,
    "platformTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weeks" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isPlayoff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matchups" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "homeScore" DOUBLE PRECISION,
    "awayScore" DOUBLE PRECISION,
    "status" "MatchupStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matchups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "team" TEXT,
    "sleeperId" TEXT,
    "espnId" INTEGER,
    "yahooId" TEXT,
    "fleaflickerId" INTEGER,
    "nflId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rosters" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "weekNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rosters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roster_spots" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "isStarter" BOOLEAN NOT NULL DEFAULT false,
    "points" DOUBLE PRECISION,

    CONSTRAINT "roster_spots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drafts" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "type" "DraftType" NOT NULL DEFAULT 'SNAKE',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "draft_picks" (
    "id" TEXT NOT NULL,
    "draftId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "pick" INTEGER NOT NULL,
    "overallPick" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "draft_picks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "weekNumber" INTEGER,
    "tradeDetails" JSONB,
    "addedPlayer" TEXT,
    "droppedPlayer" TEXT,
    "teamId" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finances" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "memberId" TEXT,
    "type" "FinanceType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "finances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_clerkId_key" ON "users"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "leagues_slug_key" ON "leagues"("slug");

-- CreateIndex
CREATE INDEX "leagues_ownerId_idx" ON "leagues"("ownerId");

-- CreateIndex
CREATE INDEX "leagues_slug_idx" ON "leagues"("slug");

-- CreateIndex
CREATE INDEX "members_leagueId_idx" ON "members"("leagueId");

-- CreateIndex
CREATE INDEX "members_userId_idx" ON "members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "members_leagueId_email_key" ON "members"("leagueId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");

-- CreateIndex
CREATE INDEX "invites_leagueId_idx" ON "invites"("leagueId");

-- CreateIndex
CREATE INDEX "invites_email_idx" ON "invites"("email");

-- CreateIndex
CREATE INDEX "invites_token_idx" ON "invites"("token");

-- CreateIndex
CREATE INDEX "seasons_leagueId_idx" ON "seasons"("leagueId");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_leagueId_year_key" ON "seasons"("leagueId", "year");

-- CreateIndex
CREATE INDEX "teams_seasonId_idx" ON "teams"("seasonId");

-- CreateIndex
CREATE INDEX "teams_memberId_idx" ON "teams"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "teams_seasonId_memberId_key" ON "teams"("seasonId", "memberId");

-- CreateIndex
CREATE INDEX "weeks_seasonId_idx" ON "weeks"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "weeks_seasonId_weekNumber_key" ON "weeks"("seasonId", "weekNumber");

-- CreateIndex
CREATE INDEX "matchups_weekId_idx" ON "matchups"("weekId");

-- CreateIndex
CREATE UNIQUE INDEX "matchups_weekId_homeTeamId_key" ON "matchups"("weekId", "homeTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "matchups_weekId_awayTeamId_key" ON "matchups"("weekId", "awayTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "players_sleeperId_key" ON "players"("sleeperId");

-- CreateIndex
CREATE UNIQUE INDEX "players_espnId_key" ON "players"("espnId");

-- CreateIndex
CREATE UNIQUE INDEX "players_yahooId_key" ON "players"("yahooId");

-- CreateIndex
CREATE UNIQUE INDEX "players_fleaflickerId_key" ON "players"("fleaflickerId");

-- CreateIndex
CREATE UNIQUE INDEX "players_nflId_key" ON "players"("nflId");

-- CreateIndex
CREATE INDEX "players_name_idx" ON "players"("name");

-- CreateIndex
CREATE INDEX "players_sleeperId_idx" ON "players"("sleeperId");

-- CreateIndex
CREATE INDEX "rosters_teamId_idx" ON "rosters"("teamId");

-- CreateIndex
CREATE INDEX "roster_spots_rosterId_idx" ON "roster_spots"("rosterId");

-- CreateIndex
CREATE INDEX "roster_spots_playerId_idx" ON "roster_spots"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "drafts_seasonId_key" ON "drafts"("seasonId");

-- CreateIndex
CREATE INDEX "draft_picks_draftId_idx" ON "draft_picks"("draftId");

-- CreateIndex
CREATE INDEX "draft_picks_teamId_idx" ON "draft_picks"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "draft_picks_draftId_overallPick_key" ON "draft_picks"("draftId", "overallPick");

-- CreateIndex
CREATE INDEX "transactions_seasonId_idx" ON "transactions"("seasonId");

-- CreateIndex
CREATE INDEX "transactions_weekNumber_idx" ON "transactions"("weekNumber");

-- CreateIndex
CREATE INDEX "finances_leagueId_idx" ON "finances"("leagueId");

-- AddForeignKey
ALTER TABLE "leagues" ADD CONSTRAINT "leagues_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invites" ADD CONSTRAINT "invites_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weeks" ADD CONSTRAINT "weeks_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matchups" ADD CONSTRAINT "matchups_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rosters" ADD CONSTRAINT "rosters_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_spots" ADD CONSTRAINT "roster_spots_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "rosters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roster_spots" ADD CONSTRAINT "roster_spots_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drafts" ADD CONSTRAINT "drafts_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_draftId_fkey" FOREIGN KEY ("draftId") REFERENCES "drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_picks" ADD CONSTRAINT "draft_picks_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finances" ADD CONSTRAINT "finances_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "leagues"("id") ON DELETE CASCADE ON UPDATE CASCADE;
