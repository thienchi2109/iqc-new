import { db } from '../lib/db/client'
import { users, devices, tests, units, methods, qcLevels, qcLots, qcLimits } from '../lib/db/schema'
import bcrypt from 'bcrypt'

async function main() {
  console.log('🌱 Seeding database...')

  try {
    // Create units
    console.log('Creating units...')
    const unitsData = [
      { code: 'mg/dL', display: 'mg/dL' },
      { code: 'mmol/L', display: 'mmol/L' },
      { code: 'g/dL', display: 'g/dL' },
      { code: 'U/L', display: 'U/L' },
      { code: 'IU/L', display: 'IU/L' },
      { code: 'ng/mL', display: 'ng/mL' },
      { code: '%', display: '%' },
    ]
    
    const insertedUnits = await db.insert(units).values(unitsData).returning()
    
    // Create methods
    console.log('Creating methods...')
    const methodsData = [
      { code: 'ENZYMATIC', name: 'Enzymatic Method' },
      { code: 'ISE', name: 'Ion Selective Electrode' },
      { code: 'IMMUNOASSAY', name: 'Immunoassay' },
      { code: 'SPECTROPHOTOMETRY', name: 'Spectrophotometry' },
      { code: 'TURBIDIMETRY', name: 'Turbidimetry' },
    ]
    
    const insertedMethods = await db.insert(methods).values(methodsData).returning()

    // Create devices
    console.log('Creating devices...')
    const devicesData = [
      {
        code: 'AU5800',
        name: 'Beckman Coulter AU5800',
        model: 'AU5800',
        manufacturer: 'Beckman Coulter',
        department: 'Chemistry',
      },
      {
        code: 'DXI800',
        name: 'Beckman Coulter DxI 800',
        model: 'DxI 800',
        manufacturer: 'Beckman Coulter',
        department: 'Immunology',
      },
      {
        code: 'COBAS6000',
        name: 'Roche cobas 6000',
        model: 'cobas 6000',
        manufacturer: 'Roche',
        department: 'Chemistry',
      },
    ]
    
    const insertedDevices = await db.insert(devices).values(devicesData).returning()

    // Create tests
    console.log('Creating tests...')
    const testsData = [
      {
        code: 'GLU',
        name: 'Glucose',
        defaultUnitId: insertedUnits.find(u => u.code === 'mg/dL')?.id,
        defaultMethodId: insertedMethods.find(m => m.code === 'ENZYMATIC')?.id,
        decimals: 1,
      },
      {
        code: 'ALT',
        name: 'Alanine Aminotransferase',
        defaultUnitId: insertedUnits.find(u => u.code === 'U/L')?.id,
        defaultMethodId: insertedMethods.find(m => m.code === 'ENZYMATIC')?.id,
        decimals: 0,
      },
      {
        code: 'CHOL',
        name: 'Total Cholesterol',
        defaultUnitId: insertedUnits.find(u => u.code === 'mg/dL')?.id,
        defaultMethodId: insertedMethods.find(m => m.code === 'ENZYMATIC')?.id,
        decimals: 0,
      },
    ]
    
    const insertedTests = await db.insert(tests).values(testsData).returning()

    // Create QC levels for each test
    console.log('Creating QC levels...')
    const qcLevelsData = []
    for (const test of insertedTests) {
      qcLevelsData.push(
        {
          testId: test.id,
          level: 'L1' as const,
          material: 'Normal Control',
        },
        {
          testId: test.id,
          level: 'L2' as const,
          material: 'Abnormal Control',
        }
      )
    }
    
    const insertedQcLevels = await db.insert(qcLevels).values(qcLevelsData).returning()

    // Create QC lots
    console.log('Creating QC lots...')
    const qcLotsData = []
    const today = new Date()
    const expireDate = new Date(today.getTime() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
    
    for (const level of insertedQcLevels) {
      qcLotsData.push({
        levelId: level.id,
        lotCode: `LOT${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        expireDate: expireDate.toISOString().split('T')[0],
        effectiveFrom: today.toISOString().split('T')[0],
        supplier: 'Bio-Rad',
        notes: 'Seeded lot for testing',
      })
    }
    
    const insertedQcLots = await db.insert(qcLots).values(qcLotsData).returning()

    // Create users
    console.log('Creating users...')
    const hashedPassword = await bcrypt.hash('password123', 10)
    
    const usersData = [
      {
        username: 'admin',
        name: 'System Administrator',
        role: 'admin' as const,
        passwordHash: hashedPassword,
      },
      {
        username: 'qaqc1',
        name: 'QA/QC Specialist',
        role: 'qaqc' as const,
        passwordHash: hashedPassword,
      },
      {
        username: 'supervisor1',
        name: 'Lab Supervisor',
        role: 'supervisor' as const,
        passwordHash: hashedPassword,
      },
      {
        username: 'tech1',
        name: 'Lab Technician 1',
        role: 'tech' as const,
        passwordHash: hashedPassword,
      },
      {
        username: 'tech2',
        name: 'Lab Technician 2',
        role: 'tech' as const,
        passwordHash: hashedPassword,
      },
    ]
    
    const insertedUsers = await db.insert(users).values(usersData).returning()

    // Create QC limits
    console.log('Creating QC limits...')
    const qcLimitsData = []
    
    // Sample limits for Glucose
    const glucoseTest = insertedTests.find(t => t.code === 'GLU')
    const glucoseLevels = insertedQcLevels.filter(l => l.testId === glucoseTest?.id)
    
    if (glucoseTest && glucoseLevels.length > 0) {
      for (const device of insertedDevices) {
        for (let i = 0; i < glucoseLevels.length; i++) {
          const level = glucoseLevels[i]
          const lot = insertedQcLots.find(l => l.levelId === level.id)
          
          if (lot) {
            const mean = i === 0 ? 95.0 : 250.0 // L1: 95, L2: 250
            const sd = mean * 0.03 // 3% CV
            const cv = 3.0
            
            qcLimitsData.push({
              testId: glucoseTest.id,
              levelId: level.id,
              lotId: lot.id,
              deviceId: device.id,
              mean: mean.toString(),
              sd: sd.toFixed(2),
              cv: cv.toFixed(2),
              source: 'manufacturer' as const,
              createdBy: insertedUsers.find(u => u.role === 'admin')?.id,
            })
          }
        }
      }
    }
    
    await db.insert(qcLimits).values(qcLimitsData).returning()

    console.log('✅ Database seeded successfully!')
    console.log(`📊 Created:`)
    console.log(`  - ${insertedUsers.length} users`)
    console.log(`  - ${insertedDevices.length} devices`)
    console.log(`  - ${insertedTests.length} tests`)
    console.log(`  - ${insertedUnits.length} units`)
    console.log(`  - ${insertedMethods.length} methods`)
    console.log(`  - ${insertedQcLevels.length} QC levels`)
    console.log(`  - ${insertedQcLots.length} QC lots`)
    console.log(`  - ${qcLimitsData.length} QC limits`)
    
    console.log(`\\n🔐 Login credentials (password: password123):`)
    for (const user of insertedUsers) {
      console.log(`  - ${user.username} (${user.role}): ${user.name}`)
    }

  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

main()
  .then(() => {
    console.log('🏁 Seeding completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error)
    process.exit(1)
  })