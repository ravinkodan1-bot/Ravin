import { NextResponse } from 'next/server';

export async function GET() {
  const SCRIPT_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL;
  const API_KEY = process.env.GOOGLE_SCRIPT_API_KEY;

  if (!SCRIPT_URL || !API_KEY) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const response = await fetch(`${SCRIPT_URL}?api_key=${API_KEY}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      // Ensure we don't cache leads
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch leads: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.status === 'error') {
      return NextResponse.json({ error: data.message }, { status: 401 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching leads via API proxy:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
