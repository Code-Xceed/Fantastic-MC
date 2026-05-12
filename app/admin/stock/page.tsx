"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Package, Plus, Search, Trash2, Upload } from "lucide-react";

interface ServiceInfo {
  name: string;
  displayName: string;
  iconUrl: string | null;
  freeStock: number;
  premiumStock: number;
}

export default function AdminStockPage() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [serviceName, setServiceName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [combos, setCombos] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [removeCapture, setRemoveCapture] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"all" | "free" | "premium" | "empty">("all");

  const fetchServices = () => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => setServices(data.services || []))
      .catch(() => {});
  };

  useEffect(() => { fetchServices(); }, []);

  const handleAddStock = async () => {
    if (!serviceName || !combos) {
      toast.error("Service name and combos are required");
      return;
    }

    setAdding(true);
    try {
      const lines = combos.split("\n").filter((l) => l.trim().length > 2);
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: serviceName,
          combos: lines,
          isPremium,
          removeCapture,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to add stock");
        return;
      }

      toast.success(`Added ${data.added} accounts (skipped ${data.duplicates} duplicates)`);
      setCombos("");
      fetchServices();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setAdding(false);
    }
  };

  const handleClearStock = async (service: string, premium: boolean) => {
    if (!confirm(`Clear all ${premium ? "premium" : "free"} stock for ${service}?`)) return;

    try {
      const res = await fetch("/api/admin/stock", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service, isPremium: premium }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to clear stock");
        return;
      }

      toast.success(`Deleted ${data.deleted} accounts`);
      fetchServices();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const handleCreateService = async () => {
    if (!serviceName) {
      toast.error("Service name is required");
      return;
    }

    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: serviceName, displayName: displayName || serviceName, iconUrl: iconUrl || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create service");
        return;
      }

      toast.success("Service created");
      setDisplayName("");
      setIconUrl("");
      fetchServices();
    } catch {
      toast.error("Something went wrong");
    }
  };

  const filteredServices = services.filter((svc) => {
    const matchesSearch =
      !search.trim() ||
      svc.name.toLowerCase().includes(search.toLowerCase()) ||
      svc.displayName.toLowerCase().includes(search.toLowerCase());
    const matchesTier =
      tierFilter === "all" ||
      (tierFilter === "free" && svc.freeStock > 0) ||
      (tierFilter === "premium" && svc.premiumStock > 0) ||
      (tierFilter === "empty" && svc.freeStock + svc.premiumStock === 0);
    return matchesSearch && matchesTier;
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCombos(ev.target?.result as string || "");
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Package className="h-6 w-6" />
        Stock Management
      </h1>

      {/* Current stock */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Current Stock</CardTitle>
            <div className="flex flex-wrap gap-2">
              {(["all", "free", "premium", "empty"] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={tierFilter === filter ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTierFilter(filter)}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services"
              className="pl-9"
            />
          </div>
          {filteredServices.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No stock rows match this view</p>
              <p className="text-sm text-muted-foreground">Adjust the search or filter, or create a new service below.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredServices.map((svc) => (
                <div key={svc.name} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{svc.displayName}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary">Free: {svc.freeStock}</Badge>
                      <Badge>Premium: {svc.premiumStock}</Badge>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClearStock(svc.name, false)}
                      disabled={svc.freeStock === 0}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Free
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleClearStock(svc.name, true)}
                      disabled={svc.premiumStock === 0}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Premium
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Add stock */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Stock
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Service Name</Label>
              <Input
                placeholder="e.g. minecraft"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                list="service-names"
              />
              <datalist id="service-names">
                {services.map((s) => (
                  <option key={s.name} value={s.name} />
                ))}
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>Tier</Label>
              <div className="flex gap-2">
                <Button
                  variant={!isPremium ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPremium(false)}
                >
                  Free
                </Button>
                <Button
                  variant={isPremium ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsPremium(true)}
                >
                  Premium
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Account Combos (one per line)</Label>
              <label className="flex items-center gap-1 text-sm cursor-pointer text-muted-foreground hover:text-foreground">
                <Upload className="h-4 w-4" />
                Upload .txt
                <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
            <Textarea
              placeholder="email1:password1&#10;email2:password2&#10;..."
              value={combos}
              onChange={(e) => setCombos(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="removeCapture"
              checked={removeCapture}
              onChange={(e) => setRemoveCapture(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="removeCapture" className="text-sm">
              Strip capture data (text after |)
            </Label>
          </div>

          <Button onClick={handleAddStock} disabled={adding || !serviceName || !combos}>
            {adding ? "Adding..." : "Add Stock"}
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Create new service */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Service</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Service Name (lowercase, no spaces)</Label>
              <Input
                placeholder="e.g. minecraft"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value.toLowerCase().replace(/\s/g, "_"))}
              />
            </div>
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                placeholder="e.g. Minecraft Java"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Icon URL</Label>
              <Input
                placeholder="https://example.com/icon.png"
                value={iconUrl}
                onChange={(e) => setIconUrl(e.target.value)}
              />
            </div>
          </div>
          <Button variant="outline" onClick={handleCreateService}>
            Create Service
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
