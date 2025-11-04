import { NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin"; // your admin firestore
// or wherever you init admin

export async function POST(req: Request) {
  try {
    const { partnerId, mapsUrl } = await req.json();
    if (!partnerId || !mapsUrl) {
      throw new Error("partnerId and mapsUrl are required");
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error("Missing GOOGLE_MAPS_API_KEY");

    // call Google Geocoding with the link
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        mapsUrl
      )}&key=${apiKey}`
    );
    const data = await res.json();

    if (!data.results?.length) {
      throw new Error("Could not geocode this URL");
    }

    const best = data.results[0];
    const address = best.formatted_address;
    const { lat, lng } = best.geometry.location;

    // update partnerUser
    await db
      .doc(`partnerUsers/${partnerId}`)
      .set(
        {
          googleMapsUrl: mapsUrl,
          address,
          location: { lat, lng },
          geocodedAt: new Date(),
        },
        { merge: true }
      );

    return NextResponse.json({
      ok: true,
      address,
      location: { lat, lng },
    });
  } catch (err: any) {
    console.error("geocode partner error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 400 });
  }
}
