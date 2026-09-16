import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const sizeParam = searchParams.get("size") ?? "300";
  const parsedSize = parseInt(sizeParam, 10);
  const size = Math.min(Math.max(isNaN(parsedSize) ? 300 : parsedSize, 100), 600);

  if (!url) {
    return NextResponse.json({ error: "url parameter is required" }, { status: 400 });
  }

  try {
    // searchParams.get("url") already percent-decodes once per WHATWG standard.
    // Pass url directly without redundant decodeURIComponent to prevent URIError crashes.
    const buffer = await QRCode.toBuffer(url, {
      width: size,
      margin: 2,
      color: {
        dark: "#09090b", // near-black
        light: "#ffffff",
      },
      errorCorrectionLevel: "H",
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch (error) {
    console.error("[QR_ERROR]", error);
    return NextResponse.json({ error: "Failed to generate QR code." }, { status: 500 });
  }
}
