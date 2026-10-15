import { z } from "zod";

export const email = z.string().trim().toLowerCase().email().max(254);
export const password = z.string().min(1).max(256);
export const name = z.string().trim().min(1).max(100);
export const code = z.string().trim().min(1).max(32);
