"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Package, Plus, Search, Trash2, Upload, Server } from "lucide-react";

interface ServiceInfo {
  name: string;
  displayName: string;
  iconUrl: string | null;
  freeStock: number;
  premiumStock: number;
}

export default function AdminStockPage() {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  
  // Add Stock State
  const [selectedService, setSelectedService] = useState("");
  const [combos, setCombos] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [removeCapture, setRemoveCapture] = useState(true);
  const [adding, setAdding] = useState(false);
  
  // Create Service State
  const [newServiceName, setNewServiceName] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newIconUrl, setNewIconUrl] = useState("");
  
  // View State
  const [search, setSearch] = useState("");
  const tierFilter = "all"; // Hardcoded to all since we show both free and premium side-by-side now

  const fetchServices = () => {
    fetch("/api/services")
      .then((r) => r.json())
      .then((data) => setServices(data.services || []))
      .catch(() => {});
  };

  useEffect(() => { fetchServices(); }, []);

  const handleAddStock = async () => {
    if (!selectedService || selectedService === "none" || !combos) {
      toast.error("Please select a service and provide combos");
      return;
    }

    setAdding(true);
    try {
      const lines = combos.split("\n").filter((l) => l.trim().length > 2);
      const res = await fetch("/api/admin/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: selectedService,
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
    if (!confirm(`Are you absolutely sure you want to clear ALL ${premium ? "premium" : "free"} stock for ${service}?`)) return;

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
    if (!newServiceName) {
      toast.error("Service identifier is required");
      return;
    }

    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: newServiceName, displayName: newDisplayName || newServiceName, iconUrl: newIconUrl || null }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create service");
        return;
      }

      toast.success("Service created successfully!");
      setNewServiceName("");
      setNewDisplayName("");
      setNewIconUrl("");
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
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold flex items-center gap-3 tracking-tight">
          <div className="bg-primary/10 p-2 rounded-xl">
            <Package className="h-7 w-7 text-primary" />
          </div>
          Inventory Management
        </h1>
        <p className="text-muted-foreground ml-16">Monitor available accounts, purge testing data, and upload new combos.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Add stock */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-sm h-fit">
          <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Select Service</Label>
                <Select value={selectedService} onValueChange={(val) => setSelectedService(val || "")}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Choose a service..." />
                  </SelectTrigger>
                  <SelectContent>
                    {services.length === 0 ? (
                      <SelectItem value="none" disabled>No services available</SelectItem>
                    ) : (
                      services.map((s) => (
                        <SelectItem key={s.name} value={s.name}>
                          {s.displayName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Stock Tier</Label>
                <div className="flex gap-2">
                  <Button
                    variant={!isPremium ? "default" : "outline"}
                    className="w-full shadow-sm"
                    onClick={() => setIsPremium(false)}
                  >
                    Free
                  </Button>
                  <Button
                    variant={isPremium ? "default" : "outline"}
                    className="w-full shadow-sm"
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
                <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-primary hover:text-primary/80 transition-colors bg-primary/10 px-2.5 py-1 rounded-md">
                  <Upload className="h-3.5 w-3.5" />
                  Upload .txt
                  <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>
              <Textarea
                placeholder="user1@email.com:pass1&#10;user2@email.com:pass2&#10;..."
                value={combos}
                onChange={(e) => setCombos(e.target.value)}
                rows={8}
                className="font-mono text-sm bg-background/50 resize-none"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg border border-border/40">
              <input
                type="checkbox"
                id="removeCapture"
                checked={removeCapture}
                onChange={(e) => setRemoveCapture(e.target.checked)}
                className="rounded h-4 w-4 accent-primary"
              />
              <Label htmlFor="removeCapture" className="text-sm font-medium cursor-pointer">
                Strip capture data (removes text after | separator)
              </Label>
            </div>

            <Button size="lg" className="w-full font-bold shadow-md" onClick={handleAddStock} disabled={adding || !selectedService || selectedService === "none" || !combos}>
              {adding ? "Importing Stock..." : "Add to Inventory"}
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {/* Create new service */}
          <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-sm h-fit">
            <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-blue-500" />
                Create New Service
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Service Identifier</Label>
                  <Input
                    placeholder="e.g. minecraft"
                    value={newServiceName}
                    className="bg-background"
                    onChange={(e) => setNewServiceName(e.target.value.toLowerCase().replace(/\s/g, "_"))}
                  />
                  <p className="text-[10px] text-muted-foreground">Lowercase, no spaces. Used in DB.</p>
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    placeholder="e.g. Minecraft Java"
                    value={newDisplayName}
                    className="bg-background"
                    onChange={(e) => setNewDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Icon URL (Optional)</Label>
                  <Input
                    placeholder="https://example.com/icon.png"
                    value={newIconUrl}
                    className="bg-background"
                    onChange={(e) => setNewIconUrl(e.target.value)}
                  />
                </div>
              </div>
              <Button variant="secondary" className="w-full font-semibold shadow-sm" onClick={handleCreateService} disabled={!newServiceName}>
                Register Service
              </Button>
            </CardContent>
          </Card>

          {/* Current stock overview */}
          <Card className="border-border/40 bg-card/40 backdrop-blur-md shadow-sm flex-1">
            <CardHeader className="border-b border-border/30 bg-muted/20 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Inventory Overview</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search services..."
                  className="pl-9 bg-background"
                />
              </div>
              
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                {filteredServices.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/50 p-8 text-center bg-muted/10">
                    <Package className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="font-medium text-sm">No services found</p>
                  </div>
                ) : (
                  filteredServices.map((svc) => (
                    <div key={svc.name} className="flex flex-col gap-3 rounded-xl border border-border/50 bg-background/50 p-4 hover:border-primary/30 transition-colors">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-lg">{svc.displayName}</p>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-muted/30 p-2.5 rounded-lg border border-border/40 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="bg-background">Free</Badge>
                            <span className="font-mono font-bold text-sm">{svc.freeStock}</span>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7 opacity-80 hover:opacity-100"
                            onClick={() => handleClearStock(svc.name, false)}
                            disabled={svc.freeStock === 0}
                            title="Purge Free Stock"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        
                        <div className="flex-1 bg-primary/5 p-2.5 rounded-lg border border-primary/10 flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Badge variant="default">Premium</Badge>
                            <span className="font-mono font-bold text-sm text-primary">{svc.premiumStock}</span>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7 opacity-80 hover:opacity-100"
                            onClick={() => handleClearStock(svc.name, true)}
                            disabled={svc.premiumStock === 0}
                            title="Purge Premium Stock"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
