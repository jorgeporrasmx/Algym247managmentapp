"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthenticatedLayout } from "@/components/authenticated-layout"
import { Plus, User, Phone, MapPin, FileText, CreditCard } from "lucide-react"
import Link from "next/link"

export default function AddMemberPage() {
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    // Basic Information
    name: "",
    person: "",
    status: "active",
    start_date: "",
    
    // Personal Information
    paternal_last_name: "",
    maternal_last_name: "",
    first_name: "",
    date_of_birth: "",
    email: "",
    primary_phone: "",
    
    // Address Information
    address_1: "",
    access_type: "",
    city: "",
    state: "",
    zip_code: "",
    secondary_phone: "",
    
    // Emergency Contact
    emergency_contact_name: "",
    emergency_contact_phone: "",
    
    // Membership Information
    referred_member: "",
    selected_plan: "",
    employee: "",
    member_id: "",
    monthly_amount: "",
    expiration_date: "",
    direct_debit: "No domiciliado",
    
    // Additional Information
    how_did_you_hear: "",
    contract_link: "",
    version: "1.0"
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Combine first_name and paternal_last_name into name field if name is empty
      const memberData = {
        ...formData,
        name: formData.name || `${formData.first_name} ${formData.paternal_last_name}`.trim(),
        monthly_amount: formData.monthly_amount ? parseFloat(formData.monthly_amount) : null
      }

      const response = await fetch("/api/members", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(memberData),
      })

      if (response.ok) {
        alert("Member created successfully!")
        // Reset form
        setFormData({
          name: "",
          person: "",
          status: "active",
          start_date: "",
          paternal_last_name: "",
          maternal_last_name: "",
          first_name: "",
          date_of_birth: "",
          email: "",
          primary_phone: "",
          address_1: "",
          access_type: "",
          city: "",
          state: "",
          zip_code: "",
          secondary_phone: "",
          emergency_contact_name: "",
          emergency_contact_phone: "",
          referred_member: "",
          selected_plan: "",
          employee: "",
          member_id: "",
          monthly_amount: "",
          expiration_date: "",
          direct_debit: "No domiciliado",
          how_did_you_hear: "",
          contract_link: "",
          version: "1.0"
        })
      } else {
        const error = await response.json()
        alert(`Error: ${error.error}`)
      }
    } catch (error) {
      console.error("Error creating member:", error)
      alert("Error creating member")
    } finally {
      setSubmitting(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <AuthenticatedLayout 
      title="Add New Member"
      showBackButton
      backHref="/members"
      headerActions={
        <Button asChild>
          <Link href="/members">
            <Plus className="mr-2 h-4 w-4" />
            View All Members
          </Link>
        </Button>
      }
    >
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Create New Member</CardTitle>
            <CardDescription>
              Add a new member to the gym with comprehensive information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="person">Person</Label>
                    <Select
                      value={formData.person}
                      onValueChange={(value) => handleInputChange("person", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select person type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => handleInputChange("status", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleInputChange("start_date", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Personal Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="paternal_last_name">Paternal Last Name</Label>
                    <Input
                      id="paternal_last_name"
                      value={formData.paternal_last_name}
                      onChange={(e) => handleInputChange("paternal_last_name", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maternal_last_name">Maternal Last Name</Label>
                    <Input
                      id="maternal_last_name"
                      value={formData.maternal_last_name}
                      onChange={(e) => handleInputChange("maternal_last_name", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="primary_phone">Primary Phone</Label>
                    <Input
                      id="primary_phone"
                      type="tel"
                      value={formData.primary_phone}
                      onChange={(e) => handleInputChange("primary_phone", e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Address Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Address Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="address_1">Address 1</Label>
                    <Input
                      id="address_1"
                      value={formData.address_1}
                      onChange={(e) => handleInputChange("address_1", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="access_type">Access Type</Label>
                    <Select
                      value={formData.access_type}
                      onValueChange={(value) => handleInputChange("access_type", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select access type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="full">Full Access</SelectItem>
                        <SelectItem value="limited">Limited Access</SelectItem>
                        <SelectItem value="classes_only">Classes Only</SelectItem>
                        <SelectItem value="pool_only">Pool Only</SelectItem>
                        <SelectItem value="gym_only">Gym Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange("state", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zip_code">ZIP Code</Label>
                    <Input
                      id="zip_code"
                      value={formData.zip_code}
                      onChange={(e) => handleInputChange("zip_code", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="secondary_phone">Secondary Phone</Label>
                    <Input
                      id="secondary_phone"
                      type="tel"
                      value={formData.secondary_phone}
                      onChange={(e) => handleInputChange("secondary_phone", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Phone className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Emergency Contact</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => handleInputChange("emergency_contact_phone", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Membership Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Membership Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="referred_member">Referred Member</Label>
                    <Input
                      id="referred_member"
                      value={formData.referred_member}
                      onChange={(e) => handleInputChange("referred_member", e.target.value)}
                      placeholder="Member who referred"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="selected_plan">Selected Plan</Label>
                    <Select
                      value={formData.selected_plan}
                      onValueChange={(value) => handleInputChange("selected_plan", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select plan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                        <SelectItem value="vip">VIP</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="senior">Senior</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="corporate">Corporate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="member_id">Member ID</Label>
                    <Input
                      id="member_id"
                      value={formData.member_id}
                      onChange={(e) => handleInputChange("member_id", e.target.value)}
                      placeholder="Custom member ID"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="monthly_amount">Monthly Amount</Label>
                    <Input
                      id="monthly_amount"
                      type="number"
                      step="0.01"
                      value={formData.monthly_amount}
                      onChange={(e) => handleInputChange("monthly_amount", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="expiration_date">Expiration Date</Label>
                    <Input
                      id="expiration_date"
                      type="date"
                      value={formData.expiration_date}
                      onChange={(e) => handleInputChange("expiration_date", e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="how_did_you_hear">How Did You Hear About Us?</Label>
                    <Select
                      value={formData.how_did_you_hear}
                      onValueChange={(value) => handleInputChange("how_did_you_hear", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="social_media">Social Media</SelectItem>
                        <SelectItem value="friend_referral">Friend Referral</SelectItem>
                        <SelectItem value="google_search">Google Search</SelectItem>
                        <SelectItem value="walk_in">Walk In</SelectItem>
                        <SelectItem value="advertisement">Advertisement</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Employee</Label>
                    <Input
                      id="employee"
                      value={formData.employee}
                      onChange={(e) => handleInputChange("employee", e.target.value)}
                      placeholder="Employee information"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="direct_debit">Direct Debit</Label>
                    <Select
                      value={formData.direct_debit}
                      onValueChange={(value) => handleInputChange("direct_debit", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select direct debit status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="No domiciliado">No domiciliado</SelectItem>
                        <SelectItem value="Domiciliado">Domiciliado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <FileText className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Additional Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="contract_link">Contract Link</Label>
                    <Input
                      id="contract_link"
                      type="url"
                      value={formData.contract_link}
                      onChange={(e) => handleInputChange("contract_link", e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="version">Version</Label>
                    <Input
                      id="version"
                      value={formData.version}
                      onChange={(e) => handleInputChange("version", e.target.value)}
                      placeholder="1.0"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting ? "Creating..." : "Create Member"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link href="/members">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  )
}
