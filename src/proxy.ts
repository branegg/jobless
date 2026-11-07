import { NextResponse, type NextRequest } from "next/server";
import { isLocalRequest } from "./lib/local-request";

export function proxy(request: NextRequest) {
  if (isLocalRequest(request.headers.get("host"), request.headers.get("origin"))) return NextResponse.next();
  return new NextResponse("Joblesss only answers requests made on this computer.", { status: 403 });
}
