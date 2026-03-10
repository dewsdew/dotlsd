import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { host, port, password, command } = body;

        if (!host || !port || !command) {
            return NextResponse.json(
                { success: false, error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const pwQuery = password ? `?password=${encodeURIComponent(password)}` : '';
        const url = `http://${host}:${port}${command}${pwQuery}`;

        // DSLRBooth API mostly uses GET for these simple commands
        const res = await fetch(url, {
            method: 'GET',
        });

        const contentType = res.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await res.json();
        } else {
            data = await res.text();
        }

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to connect to DSLRBooth' },
            { status: 500 }
        );
    }
}
