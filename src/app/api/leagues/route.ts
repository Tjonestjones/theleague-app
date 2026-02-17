import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = slugify(base);
  let suffix = 0;
  while (await prisma.league.findUnique({ where: { slug } })) {
    suffix++;
    slug = `${slugify(base)}-${suffix}`;
  }
  return slug;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, sport, visibility } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: "League name is required" }, { status: 400 });
    }

    const slug = await uniqueSlug(name);

    const league = await prisma.league.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        sport: sport || "NFL",
        visibility: visibility || "PRIVATE",
        ownerId: user.id,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7-day trial
        members: {
          create: {
            userId: user.id,
            email: user.email,
            displayName: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
            role: "COMMISSIONER",
          },
        },
      },
    });

    return NextResponse.json({ league }, { status: 201 });
  } catch (error) {
    console.error("Error creating league:", error);
    return NextResponse.json({ error: "Failed to create league" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const leagues = await prisma.league.findMany({
      where: {
        members: { some: { userId: user.id } },
      },
      include: {
        _count: { select: { members: true, seasons: true } },
        members: {
          where: { userId: user.id },
          select: { role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ leagues });
  } catch (error) {
    console.error("Error fetching leagues:", error);
    return NextResponse.json({ error: "Failed to fetch leagues" }, { status: 500 });
  }
}
