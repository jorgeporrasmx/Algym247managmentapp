import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  query,
  where,
  orderBy,
  limit,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentSnapshot,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore'
import { db } from './config'

export interface Schedule {
  id?: string

  // Class Information
  schedule_id: string  // Internal ID (SCH001, SCH002, etc.)
  class_name: string
  instructor?: string
  class_type: string
  description?: string

  // Timing
  start_time: Date | Timestamp | string
  end_time: Date | Timestamp | string

  // Capacity
  max_capacity: number
  current_bookings: number

  // Location (optional)
  location?: string

  // Status
  status: 'scheduled' | 'active' | 'cancelled' | 'completed' | 'full'

  // Sync Metadata (Monday.com)
  monday_item_id?: string
  sync_status?: 'synced' | 'pending' | 'error'
  sync_error?: string
  last_synced_at?: Date | Timestamp

  // System Metadata
  created_at?: Date | Timestamp
  updated_at?: Date | Timestamp
}

export interface ScheduleWithBookings extends Schedule {
  bookings?: {
    id: string
    member_id: string
    member_name?: string
    member_email?: string
    status: string
  }[]
}

const COLLECTION_NAME = 'schedules'

export class SchedulesService {
  private static instance: SchedulesService

  static getInstance(): SchedulesService {
    if (!SchedulesService.instance) {
      SchedulesService.instance = new SchedulesService()
    }
    return SchedulesService.instance
  }

  // Generate next schedule ID
  private async generateScheduleId(): Promise<string> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    const existingIds = snapshot.docs
      .map(doc => doc.data().schedule_id)
      .filter(id => id && id.startsWith('SCH'))
      .map(id => parseInt(id.replace('SCH', ''), 10))
      .filter(num => !isNaN(num))

    const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0
    return `SCH${String(maxId + 1).padStart(4, '0')}`
  }

  // Convert Firestore document to Schedule
  private docToSchedule(doc: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): Schedule {
    const data = doc.data()
    if (!data) {
      throw new Error('Document data is undefined')
    }
    return {
      id: doc.id,
      ...data,
      start_time: data.start_time?.toDate?.() || data.start_time,
      end_time: data.end_time?.toDate?.() || data.end_time,
      created_at: data.created_at?.toDate?.() || data.created_at,
      updated_at: data.updated_at?.toDate?.() || data.updated_at,
      last_synced_at: data.last_synced_at?.toDate?.() || data.last_synced_at
    } as Schedule
  }

  // Create a new schedule item
  async createSchedule(scheduleData: Omit<Schedule, 'id' | 'schedule_id' | 'current_bookings' | 'created_at' | 'updated_at'>): Promise<Schedule> {
    const schedule_id = await this.generateScheduleId()

    const docData = {
      ...scheduleData,
      schedule_id,
      current_bookings: 0,
      start_time: scheduleData.start_time instanceof Date
        ? Timestamp.fromDate(scheduleData.start_time)
        : scheduleData.start_time,
      end_time: scheduleData.end_time instanceof Date
        ? Timestamp.fromDate(scheduleData.end_time)
        : scheduleData.end_time,
      sync_status: 'pending' as const,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp()
    }

    const docRef = await addDoc(collection(db, COLLECTION_NAME), docData)

    return {
      id: docRef.id,
      ...scheduleData,
      schedule_id,
      current_bookings: 0,
      sync_status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  // Get a single schedule by ID
  async getSchedule(id: string): Promise<Schedule | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return this.docToSchedule(docSnap)
  }

  // Get schedule by schedule_id (SCH0001, etc.)
  async getScheduleByScheduleId(scheduleId: string): Promise<Schedule | null> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('schedule_id', '==', scheduleId),
      limit(1)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    return this.docToSchedule(snapshot.docs[0])
  }

  // Get all schedules with pagination and filters
  async getSchedules(options: {
    page?: number
    limit?: number
    classType?: string
    status?: string
    date?: string  // ISO date string for filtering by day
  } = {}): Promise<{ schedules: Schedule[]; total: number }> {
    const {
      page = 1,
      limit: limitCount = 50,
      classType,
      status,
      date
    } = options

    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('start_time', 'asc')
    )

    const snapshot = await getDocs(q)
    let schedules = snapshot.docs.map(doc => this.docToSchedule(doc))

    // Apply filters in memory
    if (classType) {
      schedules = schedules.filter(s =>
        s.class_type.toLowerCase().includes(classType.toLowerCase())
      )
    }

    if (status) {
      schedules = schedules.filter(s => s.status === status)
    }

    if (date) {
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      schedules = schedules.filter(s => {
        const startTime = s.start_time instanceof Date
          ? s.start_time
          : new Date(s.start_time as string)
        return startTime >= startOfDay && startTime <= endOfDay
      })
    }

    const total = schedules.length

    // Apply pagination
    const startIndex = (page - 1) * limitCount
    schedules = schedules.slice(startIndex, startIndex + limitCount)

    return { schedules, total }
  }

  // Get upcoming schedules
  async getUpcomingSchedules(limitCount: number = 10): Promise<Schedule[]> {
    const now = new Date()

    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', 'in', ['scheduled', 'active']),
      orderBy('start_time', 'asc')
    )

    const snapshot = await getDocs(q)
    let schedules = snapshot.docs.map(doc => this.docToSchedule(doc))

    // Filter for future schedules
    schedules = schedules.filter(s => {
      const startTime = s.start_time instanceof Date
        ? s.start_time
        : new Date(s.start_time as string)
      return startTime >= now
    })

    return schedules.slice(0, limitCount)
  }

  // Update a schedule
  async updateSchedule(id: string, updates: Partial<Schedule>): Promise<Schedule | null> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    const updateData: any = {
      ...updates,
      updated_at: serverTimestamp(),
      sync_status: 'pending'
    }

    // Convert dates to Timestamps
    if (updates.start_time instanceof Date) {
      updateData.start_time = Timestamp.fromDate(updates.start_time)
    }
    if (updates.end_time instanceof Date) {
      updateData.end_time = Timestamp.fromDate(updates.end_time)
    }

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    await updateDoc(docRef, updateData)

    return this.getSchedule(id)
  }

  // Update booking count
  async updateBookingCount(id: string, increment: number): Promise<boolean> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return false
    }

    const currentData = docSnap.data()
    const newCount = Math.max(0, (currentData.current_bookings || 0) + increment)

    // Update status if full
    let newStatus = currentData.status
    if (newCount >= currentData.max_capacity && currentData.status === 'scheduled') {
      newStatus = 'full'
    } else if (newCount < currentData.max_capacity && currentData.status === 'full') {
      newStatus = 'scheduled'
    }

    await updateDoc(docRef, {
      current_bookings: newCount,
      status: newStatus,
      updated_at: serverTimestamp()
    })

    return true
  }

  // Cancel a schedule
  async cancelSchedule(id: string, reason?: string): Promise<boolean> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return false
    }

    await updateDoc(docRef, {
      status: 'cancelled',
      cancellation_reason: reason,
      cancelled_at: serverTimestamp(),
      updated_at: serverTimestamp(),
      sync_status: 'pending'
    })

    return true
  }

  // Delete a schedule
  async deleteSchedule(id: string): Promise<boolean> {
    const docRef = doc(db, COLLECTION_NAME, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return false
    }

    await deleteDoc(docRef)
    return true
  }

  // Get schedules by instructor
  async getSchedulesByInstructor(instructor: string): Promise<Schedule[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('instructor', '==', instructor),
      orderBy('start_time', 'asc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToSchedule(doc))
  }

  // Update sync status after Monday.com sync
  async updateSyncStatus(id: string, status: 'synced' | 'error', error?: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id)

    await updateDoc(docRef, {
      sync_status: status,
      sync_error: error || deleteField(),
      last_synced_at: serverTimestamp(),
      updated_at: serverTimestamp()
    })
  }

  // Get schedules needing sync
  async getSchedulesNeedingSync(): Promise<Schedule[]> {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('sync_status', '==', 'pending'),
      limit(100)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc => this.docToSchedule(doc))
  }

  // Get schedule statistics
  async getStats(period?: { start: Date; end: Date }): Promise<{
    total: number
    scheduled: number
    active: number
    completed: number
    cancelled: number
    full: number
    averageCapacity: number
    totalBookings: number
  }> {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME))
    let schedules = snapshot.docs.map(doc => this.docToSchedule(doc))

    // Filter by period if provided
    if (period) {
      schedules = schedules.filter(s => {
        const startTime = s.start_time instanceof Date
          ? s.start_time
          : new Date(s.start_time as string)
        return startTime >= period.start && startTime <= period.end
      })
    }

    const totalBookings = schedules.reduce((sum, s) => sum + (s.current_bookings || 0), 0)
    const totalCapacity = schedules.reduce((sum, s) => sum + (s.max_capacity || 0), 0)

    return {
      total: schedules.length,
      scheduled: schedules.filter(s => s.status === 'scheduled').length,
      active: schedules.filter(s => s.status === 'active').length,
      completed: schedules.filter(s => s.status === 'completed').length,
      cancelled: schedules.filter(s => s.status === 'cancelled').length,
      full: schedules.filter(s => s.status === 'full').length,
      averageCapacity: totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0,
      totalBookings
    }
  }
}
