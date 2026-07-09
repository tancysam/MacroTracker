import { NextRequest, NextResponse } from "next/server";

export function isAuthorizedCronRequest(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  return Boolean(
    cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`
  );
}

export function unauthorizedCronResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
