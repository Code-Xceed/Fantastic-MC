"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Settings, Save, AlertTriangle } from "lucide-react";

interface SiteSettings {
  adDuration: number;
  adEnabled: boolean;
  maintenanceMode: boolean;
  siteName: string;
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>({
    adDuration: 30,
    adEnabled: true,
    maintenanceMode: false,
    siteName: "FMC Gen",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setSettings(data))
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [
            { key: "ad_duration", value: String(settings.adDuration) },
            { key: "ad_enabled", value: String(settings.adEnabled) },
            { key: "maintenance_mode", value: String(settings.maintenanceMode) },
            { key: "site_name", value: settings.siteName },
          ],
        }),
      });

      if (!res.ok) {
        toast.error("Failed to save settings");
        return;
      }

      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Settings className="h-6 w-6" />
        Site Settings
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Site Name</Label>
            <Input
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Maintenance Mode</Label>
            <div className="flex items-center gap-3">
              <Button
                variant={settings.maintenanceMode ? "destructive" : "outline"}
                size="sm"
                onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                {settings.maintenanceMode ? "Enabled" : "Disabled"}
              </Button>
              <span className="text-xs text-muted-foreground">
                When enabled, users see a maintenance page instead of the site
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ad Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Ad Duration (seconds)</Label>
            <Input
              type="number"
              min={5}
              max={120}
              value={settings.adDuration}
              onChange={(e) => setSettings({ ...settings, adDuration: parseInt(e.target.value) || 30 })}
            />
            <p className="text-xs text-muted-foreground">
              How long free users must watch an ad before claiming their account
            </p>
          </div>

          <div className="space-y-2">
            <Label>Ads Enabled</Label>
            <div className="flex items-center gap-3">
              <Button
                variant={settings.adEnabled ? "default" : "outline"}
                size="sm"
                onClick={() => setSettings({ ...settings, adEnabled: !settings.adEnabled })}
              >
                {settings.adEnabled ? "Enabled" : "Disabled"}
              </Button>
              <span className="text-xs text-muted-foreground">
                Disable ads for all users (no ad wall before generation)
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg">
        <Save className="mr-2 h-4 w-4" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>
    </div>
  );
}
