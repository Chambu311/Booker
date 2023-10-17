import { PrismaClient } from "@prisma/client";
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";

const InitialSwapRequestData = z.object({
  requesterId: z.string(),
  holderId: z.string(),
  holderBookId: z.string(),
});

export const swapRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}`,
      };
    }),
  findSwapByUsersIdsAndBookId: protectedProcedure
    .input(InitialSwapRequestData)
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.swapRequest.findFirst({
        where: {
          requesterId: input.requesterId,
          holderId: input.holderId,
          holderBookId: input.holderBookId,
        },
      });
    }),
  createInitialSwapRequest: protectedProcedure
    .input(InitialSwapRequestData)
    .mutation(async ({ ctx, input }) => {
      const newSwapRequest = await ctx.prisma.swapRequest.create({
        data: {
          requesterId: input.requesterId,
          holderId: input.holderId,
          holderBookId: input.holderBookId,
        },
      });
      return newSwapRequest;
    }),
  findByUserId: protectedProcedure
    .input(
      z.object({ id: z.string(), filter: z.enum(["ALL", "RECEIVED", "SENT"]) }),
    )
    .query(async ({ ctx, input }) => {
      if (input.filter === "ALL") {
        return await getAllSwapRequestsByUserId(ctx.prisma, input.id);
      } else if (input.filter === "SENT") {
        return await getSentSwapRequestByUserId(ctx.prisma, input.id);
      } else {
        return await getReceivedSwapRequestsByUserId(ctx.prisma, input.id);
      }
    }),
  findById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.swapRequest.findUnique({
        where: {
          id: input.id,
        },
        include: {
          holder: true,
          requester: true,
          holderBook: true,
          requesterBook: true,
        },
      });
    }),
  confirmSwapRequest: protectedProcedure
    .input(z.object({ swapId: z.string(), requesterBookId: z.string()}))
    .mutation(async ({ ctx, input }) => {
        const bookFound = await ctx.prisma.book.findUnique({ where: { id: input.requesterBookId }});
        await ctx.prisma.swapRequest.update({
            where: {
                id: input.swapId,
            },
            data: {
                requesterBookId: bookFound?.id,
            }
        })
    }),
});

const getAllSwapRequestsByUserId = async (prisma: PrismaClient, id: string) => {
  return await prisma.swapRequest.findMany({
    where: {
      OR: [
        {
          requesterId: id,
        },
        {
          holderId: id,
        },
      ],
    },
    include: {
      requester: true,
      holder: true,
      holderBook: true,
      requesterBook: true,
    },
  });
};

const getSentSwapRequestByUserId = async (prisma: PrismaClient, id: string) => {
  return await prisma.swapRequest.findMany({
    where: {
      requesterId: id,
    },
    include: {
      requester: true,
      holder: true,
      holderBook: true,
      requesterBook: true,
    },
  });
};

const getReceivedSwapRequestsByUserId = async (
  prisma: PrismaClient,
  id: string,
) => {
  return await prisma.swapRequest.findMany({
    where: {
      holderId: id,
    },
    include: {
      requester: true,
      holder: true,
      holderBook: true,
      requesterBook: true,
    },
  });
};
