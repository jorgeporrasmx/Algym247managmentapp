"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { Badge } from "@/components/ui/badge"
import { CreditCard, ExternalLink, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react"

interface PaymentTestResult {
  success: boolean
  data?: {
    payment_id: string
    payment_reference: string
    payment_link: string
    fiserv_payment_id: string
    amount: number
    currency: string
    due_date: string
    expires_at: string
    member_name: string
    contract_type: string
  }
  error?: string
}

export default function PaymentTestPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<PaymentTestResult | null>(null)
  const [selectedMember, setSelectedMember] = useState("member_001")
  const [selectedContract, setSelectedContract] = useState("contract_001")
  const [paymentType, setPaymentType] = useState("membership")
  const [amount, setAmount] = useState("89.99")

  const testMembers = [
    { id: "member_001", name: "John Smith", email: "john.smith@email.com" },
    { id: "member_002", name: "Sarah Johnson", email: "sarah.johnson@email.com" },
    { id: "member_003", name: "Mike Wilson", email: "mike.wilson@email.com" },
    { id: "member_004", name: "Emily Davis", email: "emily.davis@email.com" },
    { id: "member_005", name: "David Brown", email: "david.brown@email.com" }
  ]

  const testContracts = [
    { id: "contract_001", type: "Premium", fee: 89.99 },
    { id: "contract_002", type: "Basic", fee: 49.99 },
    { id: "contract_003", type: "VIP", fee: 129.99 },
    { id: "contract_004", type: "Student", fee: 35.99 }
  ]

  const generatePaymentLink = async () => {
    setLoading(true)
    setResults(null)

    try {
      const response = await fetch("/api/payments/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          member_id: selectedMember,
          contract_id: selectedContract,
          amount: parseFloat(amount),
          payment_type: paymentType,
          description: `Test payment for ${paymentType}`
        }),
      })

      const result = await response.json()
      setResults(result)
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      })
    } finally {
      setLoading(false)
    }
  }

  const testWebhook = async (paymentReference: string, status: string = "paid") => {
    setLoading(true)

    try {
      const response = await fetch(`/api/webhooks/fiserv?payment_reference=${paymentReference}&status=${status}`)
      const result = await response.json()
      
      if (result.success) {
        alert(`Webhook test successful! Check the curl command in the response.`)
      } else {
        alert(`Webhook test failed: ${result.error}`)
      }
    } catch (error) {
      alert(`Webhook test error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  const testReports = async (reportType: string) => {
    setLoading(true)

    try {
      const response = await fetch(`/api/reports/${reportType}`)
      const result = await response.json()
      
      if (result.success) {
        alert(`${reportType} report generated successfully! Check console for details.`)
        console.log(`${reportType} Report:`, result.data)
      } else {
        alert(`${reportType} report failed: ${result.error}`)
      }
    } catch (error) {
      alert(`${reportType} report error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthenticatedLayout 
      title="Payment System Testing"
      showBackButton
      backHref="/"
    >
      <div className="space-y-6">
        {/* Payment Generation Test */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Link Generation Test
            </CardTitle>
            <CardDescription>
              Test the stub payment link generation service
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="member">Member</Label>
                <Select value={selectedMember} onValueChange={setSelectedMember}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {testMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="contract">Contract</Label>
                <Select value={selectedContract} onValueChange={setSelectedContract}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {testContracts.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.type} (${contract.fee})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="paymentType">Payment Type</Label>
                <Select value={paymentType} onValueChange={setPaymentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="membership">Membership</SelectItem>
                    <SelectItem value="renewal">Renewal</SelectItem>
                    <SelectItem value="late_fee">Late Fee</SelectItem>
                    <SelectItem value="penalty">Penalty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <Button onClick={generatePaymentLink} disabled={loading} className="w-full">
              {loading ? "Generating..." : "Generate Payment Link"}
            </Button>

            {results && (
              <div className={`p-4 rounded-lg border ${
                results.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {results.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`font-semibold ${
                    results.success ? "text-green-800" : "text-red-800"
                  }`}>
                    {results.success ? "Success" : "Error"}
                  </span>
                </div>
                
                {results.success && results.data && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Payment Reference:</span>
                        <p className="font-mono">{results.data.payment_reference}</p>
                      </div>
                      <div>
                        <span className="font-medium">Amount:</span>
                        <p>${results.data.amount}</p>
                      </div>
                      <div>
                        <span className="font-medium">Member:</span>
                        <p>{results.data.member_name}</p>
                      </div>
                      <div>
                        <span className="font-medium">Contract:</span>
                        <p>{results.data.contract_type}</p>
                      </div>
                    </div>
                    
                    <div>
                      <span className="font-medium">Payment Link:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <a 
                          href={results.data.payment_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {results.data.payment_link}
                        </a>
                        <ExternalLink className="h-4 w-4" />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => results.data && testWebhook(results.data.payment_reference, "paid")}
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Test Paid Webhook
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => results.data && testWebhook(results.data.payment_reference, "failed")}
                        className="flex items-center gap-1"
                      >
                        <AlertCircle className="h-3 w-3" />
                        Test Failed Webhook
                      </Button>
                    </div>
                  </div>
                )}
                
                {!results.success && (
                  <p className="text-red-700">{results.error}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reports Testing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Reports Testing
            </CardTitle>
            <CardDescription>
              Test the reporting endpoints for expiring and overdue items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => testReports("expiring")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Clock className="h-4 w-4" />
                Test Expiring Report
              </Button>
              
              <Button 
                onClick={() => testReports("overdue")}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                Test Overdue Report
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Data Info */}
        <Card>
          <CardHeader>
            <CardTitle>Test Data Information</CardTitle>
            <CardDescription>
              Information about the seeded test data for Sprint 1
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Payment Statuses Available:</h4>
                <div className="space-y-1">
                  <Badge variant="outline" className="bg-green-50 text-green-700">paid</Badge>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">pending</Badge>
                  <Badge variant="outline" className="bg-red-50 text-red-700">failed</Badge>
                  <Badge variant="outline" className="bg-gray-50 text-gray-700">overdue</Badge>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Test Scenarios:</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Members expiring in 3-7 days</li>
                  <li>• Overdue payments (7-15 days)</li>
                  <li>• Failed payments with retry</li>
                  <li>• Late fee generation</li>
                  <li>• Webhook processing</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
