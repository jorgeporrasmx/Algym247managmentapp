import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

export interface Booking {
  id?: string

  // Booking Information
  booking_id: string  // Internal ID (BKG001, BKG002, etc.)
  schedule_id: string
  member_id: string

  // Timing
  booking_date: Date | Timestamp | string

  // Status
  status: 'confirmed' | 'cancelled' | 'attended' | 'no_show' | 'waitlist'
  notes?: string

  // System Metadata
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
}

export interface BookingWithDetails extends Booking {
  member?: {
    id: string
    name: string
    email: string
  }
  schedule?: {
    id: string
    class_name: string
    instructor?: string
    class_type: string
    start_time: Date | Timestamp | string
    end_time: Date | Timestamp | string
    max_capacity: number
    current_bookings: number
  }
}

const COLLECTION_NAME = 'bookings'

export class BookingsService {
  private static instance: BookingsService

  static getInstance(): BookingsService {
    if (!BookingsService.instance) {
      BookingsService.instance = new BookingsService()
    }
    return BookingsService.instance
  }

  // Generate next booking ID
  private async generateBookingId(): Promise<string> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const existingIds = snapshot.docs
      .map(doc => doc.data().booking_id)
      .filter(id => id && id.startsWith('BKG'))
      .map(id => parseInt(id.replace('BKG', ''), 10))
      .filter(num => !isNaN(num))

    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0
    return `BKG${String(maxId + 1).padStart(4, '0')}`
  }

  // Convert Firestore document to Booking
  private docToBooking(doc: any): Booking {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      booking_date: data.booking_date?.toDate?.() || data.booking_date,
      created_at: data.created_at?.toDate?.() || data.created_at,
      updated_at: data.updated_at?.toDate?.() || data.updated_at
    }
  }

  // Create a new booking
  async createBooking(bookingData: Omit<Booking, 'id' | 'booking_id' | 'booking_date' | 'created_at' | 'updated_at'>): Promise<Booking> {
    const booking_id = await this.generateBookingId()

    const docData = {
      ...bookingData,
      booking_id,
      booking_date: serverTimestamp(),
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData)

    return {
      id: docRef.id,
      ...bookingData,
      booking_id,
      booking_date: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  // Get a single booking by ID
  async getBooking(id: string): Promise<Booking | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return this.docToBooking(docSnap)
  }

  // Get booking by booking_id (BKG0001, etc.)
  async getBookingByBookingId(bookingId: string): Promise<Booking | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('booking_id', '==', bookingId),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    return this.docToBooking(snapshot.docs[0])
  }

  // Get bookings for a schedule
  async getBookingsBySchedule(scheduleId: string): Promise<Booking[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('schedule_id', '==', scheduleId),
      orderBy('booking_date', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToBooking(doc))
  }

  // Get bookings for a member
  async getBookingsByMember(memberId: string): Promise<Booking[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('member_id', '==', memberId),
      orderBy('booking_date', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToBooking(doc))
  }

  // Check if member already has a booking for a schedule
  async hasExistingBooking(scheduleId: string, memberId: string): Promise<Booking | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('schedule_id', '==', scheduleId),
      where('member_id', '==', memberId),
      where('status', 'in', ['confirmed', 'waitlist']),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    return this.docToBooking(snapshot.docs[0])
  }

  // Get confirmed bookings count for a schedule
  async getConfirmedBookingsCount(scheduleId: string): Promise<number> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('schedule_id', '==', scheduleId),
      where('status', '==', 'confirmed')
    )

    const snapshot = await getDocs(q)
    return snapshot.size
  }

  // Get all bookings with pagination and filters
  async getBookings(options: {
    page?: number
    limit?: number
    memberId?: string
    scheduleId?: string
    status?: string
  } = {}): Promise<{ bookings: Booking[]; total: number }> {
    const {
      page = 1,
      limit: limitCount = 50,
      memberId,
      scheduleId,
      status
    } = options

    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('booking_date', 'desc')
    )

    const snapshot = await getDocs(q)
    let bookings = snapshot.docs.map(doc => this.docToBooking(doc))

    // Apply filters in memory
    if (memberId) {
      bookings = bookings.filter(b => b.member_id === memberId)
    }

    if (scheduleId) {
      bookings = bookings.filter(b => b.schedule_id === scheduleId)
    }

    if (status) {
      bookings = bookings.filter(b => b.status === status)
    }

    const total = bookings.length

    // Apply pagination
    const startIndex = (page - 1) * limitCount
    bookings = bookings.slice(startIndex, startIndex + limitCount)

    return { bookings, total }
  }

  // Update a booking
  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    const updateData: any = {
      ...updates,
      updated_at: serverTimestamp()
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    await updateDoc(docRef, updateData)

    return this.getBooking(id)
  }

  // Cancel a booking
  async cancelBooking(id: string, reason?: string): Promise<boolean> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return false
    }

    await updateDoc(docRef, {
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })

    return true
  }

  // Mark attendance
  async markAttendance(id: string, attended: boolean): Promise<boolean> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return false
    }

    await updateDoc(docRef, {
      status: attended ? 'attended' : 'no_show',
      attendance_marked_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })

    return true
  }

  // Delete a booking
  async deleteBooking(id: string): Promise<boolean> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return false
    }

    await deleteDoc(docRef)
    return true
  }

  // Get booking statistics
  async getStats(period?: { start: Date; end: Date }): Promise<{
    total: number
    confirmed: number
    cancelled: number
    attended: number
    noShow: number
    waitlist: number
    attendanceRate: number
  }> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    let bookings = snapshot.docs.map(doc => this.docToBooking(doc))

    // Filter by period if provided
    if (period) {
      bookings = bookings.filter(b => {
        const bookingDate = b.booking_date instanceof Date
          ? b.booking_date
          : new Date(b.booking_date as string)
        return bookingDate >= period.start && bookingDate <= period.end
      })
    }

    const confirmed = bookings.filter(b => b.status === 'confirmed').length
    const attended = bookings.filter(b => b.status === 'attended').length
    const noShow = bookings.filter(b => b.status === 'no_show').length
    const completedBookings = attended + noShow

    return {
      total: bookings.length,
      confirmed,
      cancelled: bookings.filter(b => b.status === 'cancelled').length,
      attended,
      noShow,
      waitlist: bookings.filter(b => b.status === 'waitlist').length,
      attendanceRate: completedBookings > 0 ? Math.round((attended / completedBookings) * 100) : 0
    }
  }
}
