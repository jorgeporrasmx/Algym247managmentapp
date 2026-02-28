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
  startAfter,
  DocumentData,
  QueryDocumentSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

export interface ScheduleItem {
  id?: string
  class_name: string
  instructor?: string
  class_type: string
  start_time: string | Date | Timestamp
  end_time: string | Date | Timestamp
  max_capacity: number
  current_bookings?: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  description?: string
  bookings?: Booking[]
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
}

export interface Booking {
  id?: string
  schedule_id: string
  member_id: string
  member_name?: string
  member_email?: string
  status: 'confirmed' | 'cancelled' | 'attended' | 'no_show'
  created_at?: Date | Timestamp
}

const SCHEDULE_COLLECTION = 'schedule'
const BOOKINGS_COLLECTION = 'bookings'

function getFirestore() {
  if (!db) {
    throw new Error('Firebase not configured. Please set NEXT_PUBLIC_FIREBASE_* environment variables.')
  }
  return db
}

export class ScheduleService {
  private static instance: ScheduleService

  static getInstance(): ScheduleService {
    if (!ScheduleService.instance) {
      ScheduleService.instance = new ScheduleService()
    }
    return ScheduleService.instance
  }

  // Schedule Items
  async createScheduleItem(itemData: Omit<ScheduleItem, 'id'>): Promise<ScheduleItem> {
    const firestore = getFirestore()

    const docData = {
      ...itemData,
      current_bookings: 0,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    }

    const docRef = await addDoc(collection(firestore, SCHEDULE_COLLECTION), docData)

    return {
      ...itemData,
      id: docRef.id,
      current_bookings: 0,
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  async getScheduleItem(id: string): Promise<ScheduleItem | null> {
    const docRef = doc(getFirestore(), SCHEDULE_COLLECTION, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    const item = { id: docSnap.id, ...docSnap.data() } as ScheduleItem

    // Get bookings for this schedule item
    const bookingsQuery = query(
      collection(getFirestore(), BOOKINGS_COLLECTION),
      where('schedule_id', '==', id)
    )
    const bookingsSnap = await getDocs(bookingsQuery)
    item.bookings = bookingsSnap.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Booking))

    return item
  }

  async listScheduleItems(options: {
    pageSize?: number
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    classType?: string
    status?: string
    date?: string
  } = {}): Promise<{
    items: ScheduleItem[]
    lastDoc?: QueryDocumentSnapshot<DocumentData>
    hasMore: boolean
  }> {
    const { pageSize = 50, lastDoc: lastDocument, classType, status } = options

    let q = query(
      collection(getFirestore(), SCHEDULE_COLLECTION),
      orderBy('start_time', 'asc'),
      limit(pageSize + 1)
    )

    if (classType) {
      q = query(q, where('class_type', '==', classType))
    }

    if (status) {
      q = query(q, where('status', '==', status))
    }

    if (lastDocument) {
      q = query(q, startAfter(lastDocument))
    }

    const querySnapshot = await getDocs(q)
    const docs = querySnapshot.docs
    const hasMore = docs.length > pageSize

    if (hasMore) {
      docs.pop()
    }

    const items: ScheduleItem[] = docs.map(d => ({
      id: d.id,
      ...d.data()
    } as ScheduleItem))

    return {
      items,
      lastDoc: hasMore ? docs[docs.length - 1] : undefined,
      hasMore
    }
  }

  async updateScheduleItem(id: string, updates: Partial<ScheduleItem>): Promise<void> {
    const docRef = doc(getFirestore(), SCHEDULE_COLLECTION, id)
    await updateDoc(docRef, {
      ...updates,
      updated_at: serverTimestamp()
    })
  }

  async deleteScheduleItem(id: string): Promise<void> {
    const docRef = doc(getFirestore(), SCHEDULE_COLLECTION, id)
    await deleteDoc(docRef)
  }

  // Bookings
  async createBooking(bookingData: Omit<Booking, 'id'>): Promise<Booking> {
    const firestore = getFirestore()

    // Check capacity
    const scheduleItem = await this.getScheduleItem(bookingData.schedule_id)
    if (!scheduleItem) {
      throw new Error('Schedule item not found')
    }

    const currentBookings = scheduleItem.current_bookings || 0
    if (currentBookings >= scheduleItem.max_capacity) {
      throw new Error('Class is full')
    }

    const docData = {
      ...bookingData,
      created_at: serverTimestamp(),
    }

    const docRef = await addDoc(collection(firestore, BOOKINGS_COLLECTION), docData)

    // Update booking count
    await this.updateScheduleItem(bookingData.schedule_id, {
      current_bookings: currentBookings + 1
    })

    return {
      ...bookingData,
      id: docRef.id,
      created_at: new Date()
    }
  }

  async cancelBooking(bookingId: string): Promise<void> {
    const bookingRef = doc(getFirestore(), BOOKINGS_COLLECTION, bookingId)
    const bookingSnap = await getDoc(bookingRef)

    if (!bookingSnap.exists()) {
      throw new Error('Booking not found')
    }

    const booking = bookingSnap.data() as Booking
    await updateDoc(bookingRef, { status: 'cancelled' })

    // Decrement booking count
    const scheduleItem = await this.getScheduleItem(booking.schedule_id)
    if (scheduleItem) {
      const currentBookings = Math.max(0, (scheduleItem.current_bookings || 0) - 1)
      await this.updateScheduleItem(booking.schedule_id, {
        current_bookings: currentBookings
      })
    }
  }

  async getBookingsByMember(memberId: string): Promise<Booking[]> {
    const q = query(
      collection(getFirestore(), BOOKINGS_COLLECTION),
      where('member_id', '==', memberId)
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as Booking))
  }

  async getStats(): Promise<{
    total: number
    scheduled: number
    completed: number
    cancelled: number
  }> {
    const stats = { total: 0, scheduled: 0, completed: 0, cancelled: 0 }

    const querySnapshot = await getDocs(collection(getFirestore(), SCHEDULE_COLLECTION))

    querySnapshot.docs.forEach(d => {
      const item = d.data() as ScheduleItem
      stats.total++

      switch (item.status) {
        case 'scheduled': stats.scheduled++; break
        case 'completed': stats.completed++; break
        case 'cancelled': stats.cancelled++; break
      }
    })

    return stats
  }
}

export default ScheduleService.getInstance()
