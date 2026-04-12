'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, XCircle, FileText, AlertCircle, Loader2 } from 'lucide-react'

type VerificationType = 'stripe' | 'certificate'

export default function VerifyPage() {
  const router = useRouter()

  // User state
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Stripe state
  const [stripeFile, setStripeFile] = useState<File | null>(null)
  const [stripeLoading, setStripeLoading] = useState(false)
  const [stripeResult, setStripeResult] = useState<{ status: string; reason: string } | null>(null)
  const [stripeError, setStripeError] = useState<string | null>(null)

  // Certificate state (minder only)
  const [certFile, setCertFile] = useState<File | null>(null)
  const [certLoading, setCertLoading] = useState(false)
  const [certResult, setCertResult] = useState<{ status: string; reason: string } | null>(null)
  const [certError, setCertError] = useState<string | null>(null)

  // Auto-redirect when both required verifications are done
  useEffect(() => {
    if (!loading && stripeResult?.status === 'verified') {
      const isMinder = userRoles.includes('minder')
      const certificateVerified = !isMinder || certResult?.status === 'verified'

      if (certificateVerified) {
        const timer = setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 2000)
        return () => clearTimeout(timer)
      }
    }
  }, [stripeResult, certResult, userRoles, loading, router])

  // Fetch user roles on mount
  useEffect(() => {
    const fetchUserRoles = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: roleData } = await supabase
        .from('roles')
        .select('role_type')
        .eq('user_id', user.id)

      const roles = roleData?.map((r) => r.role_type) || []
      setUserRoles(roles)
      setLoading(false)
    }

    fetchUserRoles()
  }, [router])

  const getUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: VerificationType) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/') && selectedFile.type !== 'application/pdf') {
        if (type === 'stripe') setStripeError('Please select an image or PDF file')
        else setCertError('Please select an image or PDF file')
        return
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        if (type === 'stripe') setStripeError('File size must be less than 10MB')
        else setCertError('File size must be less than 10MB')
        return
      }

      if (type === 'stripe') {
        setStripeFile(selectedFile)
        setStripeError(null)
      } else {
        setCertFile(selectedFile)
        setCertError(null)
      }
    }
  }

  const handleSubmitVerification = async (type: VerificationType) => {
    const file = type === 'stripe' ? stripeFile : certFile
    if (!file) return

    if (type === 'stripe') setStripeLoading(true)
    else setCertLoading(true)

    const user = await getUser()
    if (!user) {
      if (type === 'stripe') setStripeError('Not logged in')
      else setCertError('Not logged in')
      if (type === 'stripe') setStripeLoading(false)
      else setCertLoading(false)
      return
    }

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('userId', user.id)
      formData.append('type', type === 'stripe' ? 'identity' : 'certificate')

      const res = await fetch('/api/verify-document', {
        method: 'POST',
        body: formData
      })

      const data = await res.json()

      if (res.ok) {
        if (type === 'stripe') {
          setStripeResult(data)
        } else {
          setCertResult(data)
        }
      } else {
        if (type === 'stripe') {
          setStripeError(data.error || 'Verification failed')
        } else {
          setCertError(data.error || 'Verification failed')
        }
      }
    } catch (err) {
      if (type === 'stripe') {
        setStripeError('Network error. Please try again.')
      } else {
        setCertError('Network error. Please try again.')
      }
    }

    if (type === 'stripe') setStripeLoading(false)
    else setCertLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const isMinder = userRoles.includes('minder')

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-8 px-4">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Verify Your Identity</h1>
        <p className="text-muted-foreground">
          Complete verification to start using Pet Minder
        </p>
      </div>

      {/* Government ID - Always Required */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Government ID
            <Badge variant="default">Required</Badge>
          </CardTitle>
          <CardDescription>
            Upload your government-issued ID (passport, driver's license, or national ID)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Select ID Document</label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => handleFileChange(e, 'stripe')}
              disabled={stripeResult?.status === 'verified'}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
            />
            {stripeFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {stripeFile.name} ({(stripeFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {stripeError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{stripeError}</p>
            </div>
          )}

          {stripeResult && (
            <div className={`flex items-center gap-2 p-3 border rounded-md ${
              stripeResult.status === 'verified'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              {stripeResult.status === 'verified' ? (
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  stripeResult.status === 'verified' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {stripeResult.status === 'verified' ? 'Verified!' : 'Failed'}
                </p>
                <p className="text-sm text-muted-foreground">{stripeResult.reason}</p>
              </div>
            </div>
          )}

          <Button
            onClick={() => handleSubmitVerification('stripe')}
            disabled={stripeLoading || !stripeFile || stripeResult?.status === 'verified'}
            className="w-full"
          >
            {stripeLoading ? 'Analysing...' : 'Verify ID'}
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Testing:Download mock from<code>/mock-id.html</code></p>
          </div>
        </CardContent>
      </Card>

      {/* Safety Certificate - Minder Only */}
      {isMinder && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Safety Certificate
              <Badge variant="default">Required for Minders</Badge>
            </CardTitle>
            <CardDescription>
              Upload a certificate (DBS Enhanced, animal safety training, etc.)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Select Certificate</label>
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => handleFileChange(e, 'certificate')}
                disabled={certResult?.status === 'verified'}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              {certFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {certFile.name} ({(certFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {certError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">{certError}</p>
              </div>
            )}

            {certResult && (
              <div className={`flex items-center gap-2 p-3 border rounded-md ${
                certResult.status === 'verified'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                {certResult.status === 'verified' ? (
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                <div>
                  <p className={`text-sm font-medium ${
                    certResult.status === 'verified' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {certResult.status === 'verified' ? 'Verified!' : 'Failed'}
                  </p>
                  <p className="text-sm text-muted-foreground">{certResult.reason}</p>
                </div>
              </div>
            )}

            <Button
              onClick={() => handleSubmitVerification('certificate')}
              disabled={certLoading || !certFile || certResult?.status === 'verified'}
              className="w-full"
            >
              {certLoading ? 'Analysing...' : 'Verify Certificate'}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Testing: Download mock from <code>/mock-certificate.html</code></p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Summary */}
      {(stripeResult || certResult) && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-blue-900">Status:</p>
                <ul className="space-y-1 text-blue-800">
                  <li className="flex items-center gap-2">
                    {stripeResult?.status === 'verified' ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-gray-400" />
                    )}
                    ID: {stripeResult?.status === 'verified' ? 'Verified ✓' : 'Pending'}
                  </li>
                  {isMinder && (
                    <li className="flex items-center gap-2">
                      {certResult?.status === 'verified' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-gray-400" />
                      )}
                      Certificate: {certResult?.status === 'verified' ? 'Verified ✓' : 'Pending'}
                    </li>
                  )}
                </ul>
                {stripeResult?.status === 'verified' && (!isMinder || certResult?.status === 'verified') && (
                  <p className="text-green-700 font-medium mt-2">✓ Redirecting...</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}