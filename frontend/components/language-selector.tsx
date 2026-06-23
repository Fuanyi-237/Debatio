'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useI18n, languages, Language } from '@/lib/i18n'

export function LanguageSelector() {
  const { language, setLanguage } = useI18n()

  return (
    <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
      <SelectTrigger className="w-32 bg-gray-800 border-gray-600 text-white">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-gray-800 border-gray-600">
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="mr-2">{lang.flag}</span>
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
