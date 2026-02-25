"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Button } from "@/components/ui/button";

interface QRScannerProps {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
    const [error, setError] = useState("");

    useEffect(() => {
        // Create new scanner instance
        const html5QrcodeScanner = new Html5QrcodeScanner(
            "qr-reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
        );

        html5QrcodeScanner.render(
            (decodedText) => {
                onScan(decodedText);
                html5QrcodeScanner.clear();
            },
            (error) => {
                // Usually frequent failure warnings as it tries to read empty space, ignored mostly
            }
        );

        return () => {
            // Cleanup
            html5QrcodeScanner.clear().catch(e => console.error("Failed to clear html5QrcodeScanner", e));
        };
    }, [onScan]);

    return (
        <div className="flex flex-col items-center space-y-4">
            <div id="qr-reader" className="w-full max-w-sm rounded-lg overflow-hidden border-2 border-slate-200" />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button variant="outline" onClick={onClose} className="w-full">
                Cancel Scanning
            </Button>
        </div>
    );
}
