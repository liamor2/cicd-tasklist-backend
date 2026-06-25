import { describe, it, expect, vi, beforeEach } from "vitest";

const prismaClientConstructor = vi.hoisted(() =>
	vi.fn(function PrismaClient(this: { task: Record<string, never> }) {
		this.task = {};
	}),
);

vi.mock("@prisma/client", () => ({
	PrismaClient: prismaClientConstructor,
}));

describe("Prisma singleton", () => {
	beforeEach(() => {
		vi.resetModules();
		prismaClientConstructor.mockClear();
	});

	it("should create and export a PrismaClient instance", async () => {
		const { default: prisma } = await import("../../lib/prisma.js");

		expect(prismaClientConstructor).toHaveBeenCalledTimes(1);
		expect(prisma).toBeInstanceOf(prismaClientConstructor);
	});
});
