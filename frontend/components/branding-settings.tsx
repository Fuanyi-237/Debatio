'use client'

import { useBranding } from '@/lib/branding'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Palette, RotateCcw, Image, MessageSquare, Type } from 'lucide-react'

export function BrandingSettings() {
  const {
    logoUrl,
    primaryColor,
    secondaryColor,
    backgroundColor,
    welcomeMessage,
    footerText,
    setBranding,
    resetToDefault
  } = useBranding()

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <Palette className="h-5 w-5 mr-2" />
            Custom Branding
          </h3>
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
        </div>
        <p className="text-sm text-gray-400">
          Customize the appearance of your session experience.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo URL */}
        <div className="space-y-2">
          <Label htmlFor="logo" className="text-sm text-gray-300 flex items-center">
            <Image className="h-4 w-4 mr-1" />
            Logo URL
          </Label>
          <Input
            id="logo"
            value={logoUrl || ''}
            onChange={(e) => setBranding({ logoUrl: e.target.value || null })}
            placeholder="https://example.com/logo.png"
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        {/* Colors */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primary" className="text-sm text-gray-300 flex items-center">
              <Palette className="h-4 w-4 mr-1" />
              Primary
            </Label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="primary"
                value={primaryColor}
                onChange={(e) => setBranding({ primaryColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setBranding({ primaryColor: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="secondary" className="text-sm text-gray-300">Secondary</Label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="secondary"
                value={secondaryColor}
                onChange={(e) => setBranding({ secondaryColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setBranding({ secondaryColor: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white flex-1"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="background" className="text-sm text-gray-300">Background</Label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                id="background"
                value={backgroundColor}
                onChange={(e) => setBranding({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer"
              />
              <Input
                value={backgroundColor}
                onChange={(e) => setBranding({ backgroundColor: e.target.value })}
                className="bg-gray-700 border-gray-600 text-white flex-1"
              />
            </div>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="space-y-2">
          <Label htmlFor="welcome" className="text-sm text-gray-300 flex items-center">
            <MessageSquare className="h-4 w-4 mr-1" />
            Welcome Message
          </Label>
          <Input
            id="welcome"
            value={welcomeMessage || ''}
            onChange={(e) => setBranding({ welcomeMessage: e.target.value || null })}
            placeholder="Welcome to our debate session..."
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>

        {/* Footer Text */}
        <div className="space-y-2">
          <Label htmlFor="footer" className="text-sm text-gray-300 flex items-center">
            <Type className="h-4 w-4 mr-1" />
            Footer Text
          </Label>
          <Input
            id="footer"
            value={footerText || ''}
            onChange={(e) => setBranding({ footerText: e.target.value || null })}
            placeholder="Your custom footer text..."
            className="bg-gray-700 border-gray-600 text-white"
          />
        </div>
      </CardContent>
    </Card>
  )
}
