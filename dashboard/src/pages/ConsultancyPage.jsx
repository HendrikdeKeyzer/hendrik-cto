/**
 * ConsultancyPage.jsx — Solar Intake Form
 * Task 2.1: Collects homeowner data → calls backend → shows savings + PDF preview + Stripe payment
 */

import { useState } from 'react'

const API_BASE = import.meta.env.VITE_CONSULTANCY_API || 'http://localhost:8000'

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// ── Sub-components ─────────────────────────────────────────────────────────

function FormField({ label, hint, error, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, color: '#1a1a2e' }}>
        {label}
      </label>
      {hint && <p style={{ margin: '0 0 6px', fontSize: 12, color: '#757575' }}>{hint}</p>}
      {children}
      {error && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#c62828' }}>{error}</p>}
    </div>
  )
}

function Input({ value, onChange, type = 'text', placeholder, min, max, step }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      style={{
        width: '100%',
        padding: '10px 12px',
        border: '1.5px solid #e0e0e0',
        borderRadius: 6,
        fontSize: 15,
        boxSizing: 'border-box',
        outline: 'none',
        transition: 'border-color 0.2s',
        fontFamily: 'inherit',
      }}
      onFocus={e => (e.target.style.borderColor = '#2E7D32')}
      onBlur={e => (e.target.style.borderColor = '#e0e0e0')}
    />
  )
}

function ProgressBar({ step, total }) {
  const pct = Math.round((step / total) * 100)
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#757575', marginBottom: 6 }}>
        <span>Step {step} of {total}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ background: '#e0e0e0', borderRadius: 4, height: 6 }}>
        <div style={{ background: '#2E7D32', borderRadius: 4, height: 6, width: `${pct}%`, transition: 'width 0.4s' }} />
      </div>
    </div>
  )
}

function ResultCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: accent ? '#E8F5E9' : '#f9f9f9',
      border: `1.5px solid ${accent ? '#2E7D32' : '#e0e0e0'}`,
      borderRadius: 10,
      padding: '18px 20px',
      textAlign: 'center',
      flex: '1 1 160px',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: accent ? '#2E7D32' : '#1a1a2e' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#757575', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9e9e9e', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function ConsultancyPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    postal_code: '',
    roof_area_m2: '',
    annual_consumption_kwh: '',
    roof_tilt_deg: '30',
    azimuth_deg: '180',
  })
  const [errors, setErrors] = useState({})

  // Check for success/cancel params
  const params = new URLSearchParams(window.location.search)
  const paymentSuccess = params.get('success') === '1'
  const paymentCancelled = params.get('cancelled') === '1'

  function set(field) {
    return val => setForm(f => ({ ...f, [field]: val }))
  }

  function validate() {
    const e = {}
    if (!form.name.trim() || form.name.length < 2) e.name = 'Please enter your full name'
    if (!form.email.match(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)) e.email = 'Please enter a valid email address'
    if (!form.postal_code.match(/^\d{4}\s?[A-Za-z]{2}$/)) e.postal_code = 'Enter a Dutch postal code (e.g. 1234 AB)'
    if (!form.roof_area_m2 || +form.roof_area_m2 < 6) e.roof_area_m2 = 'Minimum 6 m² roof area'
    if (!form.annual_consumption_kwh || +form.annual_consumption_kwh < 100) e.annual_consumption_kwh = 'Enter your annual electricity use (check your energy bill)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE}/api/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          roof_area_m2: +form.roof_area_m2,
          annual_consumption_kwh: +form.annual_consumption_kwh,
          roof_tilt_deg: +form.roof_tilt_deg,
          azimuth_deg: +form.azimuth_deg,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || `Server error (${res.status})`)
      }

      const data = await res.json()
      setResult(data)
      setStep(3)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handlePayment() {
    if (!result) return
    setCheckoutLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: result.report_id, email: form.email }),
      })

      if (!res.ok) throw new Error('Payment setup failed')
      const data = await res.json()
      window.location.href = data.checkout_url
    } catch (err) {
      setError(err.message)
      setCheckoutLoading(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const cardStyle = {
    maxWidth: 680,
    margin: '0 auto',
    background: 'white',
    borderRadius: 12,
    boxShadow: '0 2px 20px rgba(0,0,0,0.08)',
    padding: '36px 40px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  }

  if (paymentSuccess) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f7f0', display: 'flex', alignItems: 'center', padding: 24 }}>
        <div style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64 }}>🎉</div>
            <h1 style={{ color: '#2E7D32' }}>Payment Received!</h1>
            <p style={{ fontSize: 16, color: '#555', maxWidth: 400, margin: '0 auto 24px' }}>
              Thank you! Hendrik will personally review your data and deliver your full report within 24 hours.
              Check your email for confirmation.
            </p>
            <a href="/" style={{ color: '#2E7D32', textDecoration: 'none', fontWeight: 600 }}>← Back to Dashboard</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0f7f0 0%, #fff8e1 100%)', padding: '40px 16px' }}>

      {/* Hero header */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <h1 style={{ fontSize: 32, color: '#2E7D32', margin: '0 0 8px', fontFamily: 'system-ui, sans-serif' }}>
          ☀️ How Much Can Solar Save You?
        </h1>
        <p style={{ fontSize: 16, color: '#555', margin: 0 }}>
          Fill in 5 fields — get your personalised savings estimate in 30 seconds
        </p>
      </div>

      <div style={cardStyle}>
        {step < 3 && <ProgressBar step={step} total={2} />}

        {/* ── STEP 1: Personal details ── */}
        {step === 1 && (
          <form onSubmit={e => { e.preventDefault(); if (validate()) setStep(2) }}>
            <h2 style={{ marginTop: 0, color: '#1a1a2e', fontSize: 20 }}>About You</h2>

            <FormField label="Your name" error={errors.name}>
              <Input value={form.name} onChange={set('name')} placeholder="Jan de Vries" />
            </FormField>

            <FormField label="Email address" hint="We'll send your report here" error={errors.email}>
              <Input value={form.email} onChange={set('email')} type="email" placeholder="jan@example.nl" />
            </FormField>

            <FormField label="Postal code" hint="Dutch postal code (4 digits + 2 letters)" error={errors.postal_code}>
              <Input value={form.postal_code} onChange={set('postal_code')} placeholder="1234 AB" />
            </FormField>

            <button type="submit" style={{
              width: '100%', padding: '14px', background: '#2E7D32', color: 'white',
              border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer',
              marginTop: 8, transition: 'background 0.2s',
            }}
              onMouseOver={e => e.target.style.background = '#1b5e20'}
              onMouseOut={e => e.target.style.background = '#2E7D32'}
            >
              Next: Roof Details →
            </button>
          </form>
        )}

        {/* ── STEP 2: Roof details ── */}
        {step === 2 && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ marginTop: 0, color: '#1a1a2e', fontSize: 20 }}>Your Roof & Energy Use</h2>

            <FormField
              label="Available roof area (m²)"
              hint="Estimate the south-facing, shade-free area of your roof"
              error={errors.roof_area_m2}
            >
              <Input value={form.roof_area_m2} onChange={set('roof_area_m2')} type="number" placeholder="40" min="6" max="2000" step="1" />
            </FormField>

            <FormField
              label="Annual electricity consumption (kWh)"
              hint="Find this on your annual energy statement — average NL household uses ~3,000 kWh"
              error={errors.annual_consumption_kwh}
            >
              <Input value={form.annual_consumption_kwh} onChange={set('annual_consumption_kwh')} type="number" placeholder="3500" min="100" max="100000" step="100" />
            </FormField>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Roof tilt (°)" hint="0=flat, 30=typical, 45=steep">
                <Input value={form.roof_tilt_deg} onChange={set('roof_tilt_deg')} type="number" min="0" max="60" step="5" />
              </FormField>
              <FormField label="Roof direction" hint="180=south (best), 90=east, 270=west">
                <Input value={form.azimuth_deg} onChange={set('azimuth_deg')} type="number" min="0" max="360" step="45" />
              </FormField>
            </div>

            {error && (
              <div style={{ background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 6, padding: '12px 16px', marginBottom: 16, color: '#c62828', fontSize: 14 }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setStep(1)} style={{
                flex: '0 0 auto', padding: '14px 20px', background: 'transparent', color: '#555',
                border: '1.5px solid #e0e0e0', borderRadius: 8, fontSize: 15, cursor: 'pointer',
              }}>
                ← Back
              </button>
              <button type="submit" disabled={loading} style={{
                flex: 1, padding: '14px', background: loading ? '#81c784' : '#2E7D32', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? '⏳ Calculating...' : '✨ Calculate My Savings'}
              </button>
            </div>
          </form>
        )}

        {/* ── STEP 3: Results ── */}
        {step === 3 && result && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: '#2E7D32', lineHeight: 1 }}>
                €{result.annual_savings_eur.toLocaleString('nl-NL', { maximumFractionDigits: 0 })}
              </div>
              <div style={{ color: '#757575', fontSize: 14, marginTop: 4 }}>estimated annual savings</div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
              <ResultCard
                label="Annual production"
                value={`${result.annual_production_kwh.toLocaleString('nl-NL', { maximumFractionDigits: 0 })} kWh`}
                accent
              />
              <ResultCard
                label="System size"
                value={`${result.system_capacity_kw.toFixed(1)} kWp`}
                sub="recommended for your roof"
              />
              <ResultCard
                label="Payback period"
                value={typeof result.payback_years === 'number' ? `${result.payback_years} yr` : result.payback_years}
                sub="estimated"
              />
            </div>

            {/* Monthly preview bar chart */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ color: '#1a1a2e', marginBottom: 12, fontSize: 15 }}>Monthly Production Preview (May–Jul)</h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
                {result.monthly_kwh.map((v, i) => {
                  const maxV = Math.max(...result.monthly_kwh)
                  const pct = maxV > 0 ? (v / maxV) * 100 : 0
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 10, color: '#757575' }}>{v}</div>
                      <div style={{ width: '100%', background: '#2E7D32', borderRadius: '3px 3px 0 0', height: `${pct * 0.7}px`, minHeight: 4, transition: 'height 0.5s' }} />
                      <div style={{ fontSize: 10, color: '#9e9e9e' }}>{MONTH_NAMES[4 + i]}</div>
                    </div>
                  )
                })}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, opacity: 0.4 }}>
                  <div style={{ fontSize: 10, color: '#757575' }}>🔒</div>
                  <div style={{ width: '100%', background: '#e0e0e0', borderRadius: '3px 3px 0 0', height: 40 }} />
                  <div style={{ fontSize: 10, color: '#9e9e9e' }}>+9 more</div>
                </div>
              </div>
            </div>

            <div style={{ background: '#fff8e1', border: '1.5px solid #F9A825', borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 8px', color: '#1a1a2e', fontSize: 16 }}>🔒 Unlock Your Full Report — €500</h3>
              <ul style={{ margin: '0 0 16px', paddingLeft: 20, fontSize: 14, color: '#555', lineHeight: 1.8 }}>
                <li>Complete 12-month production breakdown</li>
                <li>Battery storage recommendation</li>
                <li>3 certified installer quotes (NL)</li>
                <li>SDE++ subsidy eligibility check</li>
                <li>10-year financial model (IRR/NPV)</li>
                <li><strong>30-minute consultation with Hendrik</strong></li>
              </ul>

              {paymentCancelled && (
                <div style={{ color: '#c62828', fontSize: 13, marginBottom: 12 }}>Payment was cancelled. Try again whenever you're ready.</div>
              )}
              {error && (
                <div style={{ color: '#c62828', fontSize: 13, marginBottom: 12 }}>⚠️ {error}</div>
              )}

              <button
                onClick={handlePayment}
                disabled={checkoutLoading}
                style={{
                  width: '100%', padding: '14px', background: checkoutLoading ? '#ffd54f' : '#F9A825',
                  color: '#1a1a2e', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 700,
                  cursor: checkoutLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {checkoutLoading ? '⏳ Opening payment...' : '💳 Pay €500 — Get Full Report + Consultation'}
              </button>
              <p style={{ fontSize: 11, color: '#9e9e9e', margin: '8px 0 0', textAlign: 'center' }}>
                Secure payment via Stripe · iDEAL & card accepted · 100% refund if not satisfied
              </p>
            </div>

            <div style={{ textAlign: 'center', fontSize: 13, color: '#757575' }}>
              Report ID: <strong>{result.report_id}</strong> · Preview sent to {form.email}
            </div>

            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <button onClick={() => { setStep(1); setResult(null); setErrors({}) }} style={{
                background: 'none', border: 'none', color: '#2E7D32', cursor: 'pointer', fontSize: 13, textDecoration: 'underline',
              }}>
                ← Calculate for a different address
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Trust signals */}
      <div style={{ maxWidth: 680, margin: '24px auto 0', display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        {['🔒 Secure & private', '⚡ Real NREL solar data', '🇳🇱 NL-specific analysis', '📧 Report in 30 seconds'].map(t => (
          <div key={t} style={{ fontSize: 13, color: '#757575' }}>{t}</div>
        ))}
      </div>
    </div>
  )
}
