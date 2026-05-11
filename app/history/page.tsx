"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdSlot } from "@/components/AdSlot";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { History, ChevronLeft, ChevronRight } from "lucide-react";

interface HistoryItem {
  id: number;
  service: string;
  combo: string;
  isPremium: boolean;
  generatedAt: string;
}

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/user/history?page=${page}`)
        .then((r) => r.json())
        .then((data) => {
          setHistory(data.history || []);
          setTotalPages(data.totalPages || 1);
        })
        .catch(() => {});
    }
  }, [session, page]);

  if (status === "loading") {
    return <LoadingSpinner className="py-20" text="Loading history..." />;
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h1 className="text-2xl font-bold">Please login to view your history</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <History className="h-6 w-6" />
        Generation History
      </h1>

      <AdSlot format="banner" />

      <Card>
        <CardHeader>
          <CardTitle>Your Generated Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No accounts generated yet. Head to Services to get started!
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{h.service}</p>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {h.combo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Badge variant={h.isPremium ? "default" : "secondary"}>
                      {h.isPremium ? "Premium" : "Free"}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(h.generatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
