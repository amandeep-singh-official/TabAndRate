import { getAuthCafe } from "@/lib/cafe";
import { getISTDayRange } from "@/lib/cafe-utils";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { z } from "zod";

const orderItemSchema = z.object({
  menuItemId: z.string().optional(),
  name: z.string().min(1),
  quantity: z.number().int().positive(),
  priceAtSale: z.number().nonnegative(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, "Order must have at least one item"),
  paymentMethod: z.enum(["CASH", "ONLINE"]),
  orderType: z.string().default("TAKEAWAY"),
  note: z.string().nullish(),
});

export async function GET(req: Request) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  const { searchParams } = new URL(req.url);
  const filterDate = searchParams.get("date");
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100);

  const targetDate = filterDate ? new Date(filterDate) : new Date();
  const { startOfDay, endOfDay } = getISTDayRange(targetDate);

  const orders = await prisma.order.findMany({
    where: {
      cafeId: cafe.id,
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ orders });
}

export async function POST(req: Request) {
  const { error, status, cafe } = await getAuthCafe();
  if (error || !cafe) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await req.json();
    const data = createOrderSchema.parse(body);

    const { startOfDay, endOfDay } = getISTDayRange(new Date());

    // Run inside transaction to ensure atomic token numbering
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get today's token number (count of orders today in IST + 1)
      const todayOrdersCount = await tx.order.count({
        where: {
          cafeId: cafe.id,
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });
      const tokenNumber = todayOrdersCount + 1;

      // 2. Get global order count for sequential order number (starting at 1001)
      const allOrdersCount = await tx.order.count({
        where: { cafeId: cafe.id },
      });
      const orderNumber = 1001 + allOrdersCount;

      // 3. Compute total
      const calculatedTotal = data.items.reduce(
        (acc, item) => acc + item.priceAtSale * item.quantity,
        0
      );

      // 4. Create Order and items
      const newOrder = await tx.order.create({
        data: {
          cafeId: cafe.id,
          orderNumber,
          tokenNumber,
          total: calculatedTotal,
          paymentMethod: data.paymentMethod,
          orderType: data.orderType,
          status: "COMPLETED",
          note: data.note,
          items: {
            create: data.items.map((item) => ({
              menuItemId: item.menuItemId || null,
              name: item.name,
              quantity: item.quantity,
              priceAtSale: item.priceAtSale,
            })),
          },
        },
        include: {
          items: true,
          cafe: {
            select: {
              cafeName: true,
              tagline: true,
              address: true,
              phone: true,
              city: true,
            },
          },
        },
      });

      return newOrder;
    });

    return NextResponse.json({ order: result }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
