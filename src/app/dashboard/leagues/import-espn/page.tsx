'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function ImportESPNPage() {
  const [formData, setFormData] = useState({
    league_id: '',
    year: '2024',
    espn_s2: '',
    swid: '',
  })
  
  const [status, setStatus] = useState<'idle' | 'validating' | 'importing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [leagueInfo, setLeagueInfo] = useState<any>(null)

  const handleValidate = async () => {
    setStatus('validating')
    setMessage('')
    
    try {
      const response = await fetch('/api/espn/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed')
      }

      setLeagueInfo(data)
      setStatus('success')
      setMessage(`✓ Connected to "${data.name}" (${data.size} teams, ${data.year})`)
    } catch (error: any) {
      setStatus('error')
      setMessage(`✗ ${error.message}`)
      setLeagueInfo(null)
    }
  }

  const handleImport = async () => {
    setStatus('importing')
    setMessage('Importing league data...')

    try {
      const response = await fetch('/api/espn/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setStatus('success')
      setMessage(`✓ Successfully imported ${data.data.teams.length} teams and ${data.data.matchups.length} matchups!`)
    } catch (error: any) {
      setStatus('error')
      setMessage(`✗ ${error.message}`)
    }
  }

  const isValidating = status === 'validating'
  const isImporting = status === 'importing'
  const isLoading = isValidating || isImporting

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold">Import ESPN League</h1>
        <p className="mt-2 text-muted-foreground">
          Connect your ESPN Fantasy Football league to TheLegue
        </p>
      </div>

      {/* Form */}
      <div className="space-y-6 rounded-lg border bg-card p-6">
        <div>
          <label htmlFor="league_id" className="block text-sm font-medium">
            ESPN League ID *
          </label>
          <input
            id="league_id"
            type="text"
            value={formData.league_id}
            onChange={(e) => setFormData({ ...formData, league_id: e.target.value })}
            placeholder="6911200"
            className="mt-1 w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Found in your league URL: fantasy.espn.com/football/league?leagueId=<strong>YOUR_ID</strong>
          </p>
        </div>

        <div>
          <label htmlFor="year" className="block text-sm font-medium">
            Season Year *
          </label>
          <select
            id="year"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: e.target.value })}
            className="mt-1 w-full rounded-md border px-3 py-2"
            disabled={isLoading}
          >
            {[2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015].map((year) => (
              <key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="espn_s2" className="block text-sm font-medium">
            espn_s2 Cookie *
          </label>
          <textarea
            id="espn_s2"
            value={formData.espn_s2}
            onChange={(e) => setFormData({ ...formData, espn_s2: e.target.value })}
            placeholder="AEAkOshNXKX4gkLi1laig9GETvLh0ung..."
            rows={3}
            className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="swid" className="block text-sm font-medium">
            SWID Cookie *
          </label>
          <input
            id="swid"
            type="text"
            value={formData.swid}
            onChange={(e) => setFormData({ ...formData, swid: e.target.value })}
            placeholder="{637A7E23-74FD-4BF8-BA7E-2374FD4BF891}"
            className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm"
            disabled={isLoading}
          />
        </div>

        {/* Instructions */}
        <details className="rounded-md border p-4">
          <summary className="cursor-pointer font-medium">
            📚 How to get ESPN cookies
          </summary>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>1. Open ESPN Fantasy in an <strong>incognito/private window</strong></li>
            <li>2. Log in to your ESPN account</li>
            <li>3. Navigate to your league</li>
            <li>4. Open DevTools (F12 or Cmd+Option+I)</li>
            <li>5. Go to <strong>Application → Cookies → fantasy.espn.com</strong></li>
            <li>6. Copy the values for <code className="rounded bg-muted px-1">espn_s2</code> and <code className="rounded bg-muted px-1">SWID</code></li>
          </ol>
        </details>

        {/* Status Message */}
        {message && (
          <div
            className={`rounded-md border p-4 ${
              status === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : status === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-blue-200 bg-blue-50 text-blue-800'
            }`}
          >
            {message}
          </div>
        )}

        {/* League Info Preview */}
        {leagueInfo && status === 'success' && (
          <div className="rounded-md border bg-muted/50 p-4">
            <h3 className="font-semibold">League Info:</h3>
            <ul className="mt-2 space-y-1 text-sm">
              <li><strong>Name:</strong> {leagueInfo.name}</li>
              <li><strong>Year:</strong> {leagueInfo.year}</li>
              <li><strong>Teams:</strong> {leagueInfo.size}</li>
              <li><strong>Current Week:</strong> {leagueInfo.current_week}</li>
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleValidate}
            disabled={isLoading || !formData.league_id || !formData.espn_s2 || !formData.swid}
            className="flex-1"
          >
            {isValidating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Validate Connection
          </Button>

          {leagueInfo && (
            <Button
              onClick={handleImport}
              disabled={isLoading}
              variant="default"
              className="flex-1"
            >
              {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Import League Data
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
