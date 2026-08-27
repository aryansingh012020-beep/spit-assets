/**
 * Demo mode mock data — used when DEMO_MODE=true in .env.local
 * Full realistic snapshot of a SPIT asset register.
 */
import type { Profile, AssetStatus } from '@/lib/types';

export const isDemoMode = () => process.env.DEMO_MODE === 'true';

export const DEMO_PROFILE: Profile = {
  id: 'demo-user-001',
  institution_id: 'demo-inst-001',
  role: 'approver',
  full_name: 'Dr. Priya Sharma',
  avatar_url: null,
  employee_id: 'EMP-001',
  department: 'Administration',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

export const DEMO_CATEGORIES = [
  { id: 'cat-001', name: 'Furniture',                code: 'FURN' },
  { id: 'cat-002', name: 'Computers & Peripherals',  code: 'COMP' },
  { id: 'cat-003', name: 'Air Conditioning',          code: 'ACND' },
  { id: 'cat-004', name: 'Notice Boards & Displays',  code: 'DISP' },
  { id: 'cat-005', name: 'Appliances',                code: 'APPL' },
];

export const DEMO_BUILDING = {
  id: 'bld-001', name: 'Main Building', code: 'MB',
  address: 'Bhavans Campus, Munshi Nagar, Andheri (W), Mumbai – 400 058',
};

export const DEMO_FLOORS = [
  { id: 'fl-0', name: 'Ground Floor', level: 0, building_id: 'bld-001' },
  { id: 'fl-1', name: 'First Floor',  level: 1, building_id: 'bld-001' },
  { id: 'fl-2', name: 'Second Floor', level: 2, building_id: 'bld-001' },
  { id: 'fl-3', name: 'Third Floor',  level: 3, building_id: 'bld-001' },
  { id: 'fl-4', name: 'Fourth Floor', level: 4, building_id: 'bld-001' },
  { id: 'fl-5', name: 'Fifth Floor',  level: 5, building_id: 'bld-001' },
  { id: 'fl-6', name: 'Sixth Floor',  level: 6, building_id: 'bld-001' },
  { id: 'fl-7', name: 'Seventh Floor',level: 7, building_id: 'bld-001' },
  { id: 'fl-8', name: 'Eighth Floor', level: 8, building_id: 'bld-001' },
];

export const DEMO_ROOMS = [
  { id: 'rm-001', name: 'Computer Lab 1',      room_number: '001', room_type: 'lab',            floor_id: 'fl-0', floor: { name: 'Ground Floor', building: { name: 'Main Building' } } },
  { id: 'rm-002', name: 'Principal Office',    room_number: '002', room_type: 'office',          floor_id: 'fl-0', floor: { name: 'Ground Floor', building: { name: 'Main Building' } } },
  { id: 'rm-003', name: 'Classroom 101',       room_number: '101', room_type: 'classroom',       floor_id: 'fl-1', floor: { name: 'First Floor',  building: { name: 'Main Building' } } },
  { id: 'rm-004', name: 'Classroom 102',       room_number: '102', room_type: 'classroom',       floor_id: 'fl-1', floor: { name: 'First Floor',  building: { name: 'Main Building' } } },
  { id: 'rm-005', name: 'Electronics Lab',     room_number: '201', room_type: 'lab',             floor_id: 'fl-2', floor: { name: 'Second Floor', building: { name: 'Main Building' } } },
  { id: 'rm-006', name: 'Faculty Room',        room_number: '202', room_type: 'faculty_room',    floor_id: 'fl-2', floor: { name: 'Second Floor', building: { name: 'Main Building' } } },
  { id: 'rm-007', name: 'Seminar Hall',        room_number: '301', room_type: 'seminar_hall',    floor_id: 'fl-3', floor: { name: 'Third Floor',  building: { name: 'Main Building' } } },
  { id: 'rm-008', name: 'Library',             room_number: '401', room_type: 'library',         floor_id: 'fl-4', floor: { name: 'Fourth Floor', building: { name: 'Main Building' } } },
  { id: 'rm-009', name: 'Advanced Comp Lab',   room_number: '501', room_type: 'lab',             floor_id: 'fl-5', floor: { name: 'Fifth Floor',  building: { name: 'Main Building' } } },
  { id: 'rm-010', name: 'Conference Room',     room_number: '601', room_type: 'conference_room', floor_id: 'fl-6', floor: { name: 'Sixth Floor',  building: { name: 'Main Building' } } },
];

export const DEMO_ASSETS = [
  { id: 'ast-001', asset_tag: 'SPIT/COMP/2023/00001', name: 'Dell Optiplex 7090 Desktop',     description: 'Core i7, 16GB RAM, 512GB SSD',              status: 'active'            as AssetStatus, acquisition_year: 2023, category: { id: 'cat-002', name: 'Computers & Peripherals' }, room: { id: 'rm-001', name: 'Computer Lab 1',    room_number: '001' }, floor: { name: 'Ground Floor' }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-06-01T00:00:00Z' },
  { id: 'ast-002', asset_tag: 'SPIT/COMP/2023/00002', name: 'Dell Optiplex 7090 Desktop',     description: 'Core i7, 16GB RAM, 512GB SSD',              status: 'active'            as AssetStatus, acquisition_year: 2023, category: { id: 'cat-002', name: 'Computers & Peripherals' }, room: { id: 'rm-001', name: 'Computer Lab 1',    room_number: '001' }, floor: { name: 'Ground Floor' }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-06-01T00:00:00Z' },
  { id: 'ast-003', asset_tag: 'SPIT/COMP/2022/00047', name: 'HP LaserJet Pro Printer',        description: 'Monochrome, USB + Network',                  status: 'under_maintenance' as AssetStatus, acquisition_year: 2022, category: { id: 'cat-002', name: 'Computers & Peripherals' }, room: { id: 'rm-001', name: 'Computer Lab 1',    room_number: '001' }, floor: { name: 'Ground Floor' }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-07-15T00:00:00Z' },
  { id: 'ast-004', asset_tag: 'SPIT/FURN/2021/00012', name: 'Student Desk (Single Seater)',   description: 'Wooden desk with laminate top',             status: 'active'            as AssetStatus, acquisition_year: 2021, category: { id: 'cat-001', name: 'Furniture'                }, room: { id: 'rm-003', name: 'Classroom 101',     room_number: '101' }, floor: { name: 'First Floor'  }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-01-10T00:00:00Z' },
  { id: 'ast-005', asset_tag: 'SPIT/FURN/2021/00013', name: 'Student Chair',                  description: 'Plastic moulded, stackable',                 status: 'active'            as AssetStatus, acquisition_year: 2021, category: { id: 'cat-001', name: 'Furniture'                }, room: { id: 'rm-003', name: 'Classroom 101',     room_number: '101' }, floor: { name: 'First Floor'  }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-01-10T00:00:00Z' },
  { id: 'ast-006', asset_tag: 'SPIT/ACND/2022/00003', name: 'Daikin 1.5 Ton Split AC',        description: '5 Star, Inverter',                           status: 'active'            as AssetStatus, acquisition_year: 2022, category: { id: 'cat-003', name: 'Air Conditioning'         }, room: { id: 'rm-003', name: 'Classroom 101',     room_number: '101' }, floor: { name: 'First Floor'  }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-01-10T00:00:00Z' },
  { id: 'ast-007', asset_tag: 'SPIT/DISP/2023/00011', name: 'Smart Board 85"',                description: 'ViewSonic IFP8550 Interactive Flat Panel',  status: 'active'            as AssetStatus, acquisition_year: 2023, category: { id: 'cat-004', name: 'Notice Boards & Displays'}, room: { id: 'rm-003', name: 'Classroom 101',     room_number: '101' }, floor: { name: 'First Floor'  }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-01-10T00:00:00Z' },
  { id: 'ast-008', asset_tag: 'SPIT/COMP/2020/00089', name: 'Lenovo ThinkCentre Desktop',     description: 'Core i5, 8GB RAM, 256GB SSD',               status: 'missing'           as AssetStatus, acquisition_year: 2020, category: { id: 'cat-002', name: 'Computers & Peripherals' }, room: { id: 'rm-005', name: 'Electronics Lab',   room_number: '201' }, floor: { name: 'Second Floor' }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-08-01T00:00:00Z' },
  { id: 'ast-009', asset_tag: 'SPIT/FURN/2019/00034', name: 'Faculty Table',                  description: 'Wooden table 4×2 ft',                       status: 'active'            as AssetStatus, acquisition_year: 2019, category: { id: 'cat-001', name: 'Furniture'                }, room: { id: 'rm-006', name: 'Faculty Room',      room_number: '202' }, floor: { name: 'Second Floor' }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-01-10T00:00:00Z' },
  { id: 'ast-010', asset_tag: 'SPIT/APPL/2022/00007', name: 'Aquaguard Water Purifier',        description: 'Eureka Forbes, RO+UV',                      status: 'active'            as AssetStatus, acquisition_year: 2022, category: { id: 'cat-005', name: 'Appliances'               }, room: { id: 'rm-006', name: 'Faculty Room',      room_number: '202' }, floor: { name: 'Second Floor' }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-01-10T00:00:00Z' },
  { id: 'ast-011', asset_tag: 'SPIT/FURN/2023/00099', name: 'Auditorium Chair',               description: 'Cushioned, foldable',                       status: 'active'            as AssetStatus, acquisition_year: 2023, category: { id: 'cat-001', name: 'Furniture'                }, room: { id: 'rm-007', name: 'Seminar Hall',      room_number: '301' }, floor: { name: 'Third Floor'  }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-01-10T00:00:00Z' },
  { id: 'ast-012', asset_tag: 'SPIT/DISP/2021/00005', name: 'Projector — Epson EB-X51',       description: '3800 Lumens, XGA, HDMI',                    status: 'damaged'           as AssetStatus, acquisition_year: 2021, category: { id: 'cat-004', name: 'Notice Boards & Displays'}, room: { id: 'rm-007', name: 'Seminar Hall',      room_number: '301' }, floor: { name: 'Third Floor'  }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-07-20T00:00:00Z' },
  { id: 'ast-013', asset_tag: 'SPIT/COMP/2024/00003', name: 'Apple iMac 24" (M3)',            description: '16GB RAM, 512GB SSD, Retina 4.5K',          status: 'active'            as AssetStatus, acquisition_year: 2024, category: { id: 'cat-002', name: 'Computers & Peripherals' }, room: { id: 'rm-009', name: 'Advanced Comp Lab', room_number: '501' }, floor: { name: 'Fifth Floor'  }, building: { name: 'Main Building' }, created_at: '2024-03-01T09:00:00Z', updated_at: '2024-03-01T00:00:00Z' },
  { id: 'ast-014', asset_tag: 'SPIT/FURN/2024/00006', name: 'Conference Table (10-seater)',    description: 'Engineered wood, oval top',                  status: 'active'            as AssetStatus, acquisition_year: 2024, category: { id: 'cat-001', name: 'Furniture'                }, room: { id: 'rm-010', name: 'Conference Room',   room_number: '601' }, floor: { name: 'Sixth Floor'  }, building: { name: 'Main Building' }, created_at: '2024-03-01T09:00:00Z', updated_at: '2024-03-01T00:00:00Z' },
  { id: 'ast-015', asset_tag: 'SPIT/ACND/2021/00014', name: 'LG 2 Ton Split AC',              description: '3 Star, Fixed Speed',                       status: 'retired'           as AssetStatus, acquisition_year: 2021, category: { id: 'cat-003', name: 'Air Conditioning'         }, room: { id: 'rm-008', name: 'Library',           room_number: '401' }, floor: { name: 'Fourth Floor' }, building: { name: 'Main Building' }, created_at: '2024-01-10T09:00:00Z', updated_at: '2024-06-10T00:00:00Z' },
];

export const DEMO_HISTORY = [
  { id: 'h-001', event_type: 'addition_approved',  occurred_at: '2024-08-20T10:30:00Z', reason: 'New procurement batch 2024',           asset: { id: 'ast-013', asset_tag: 'SPIT/COMP/2024/00003', name: 'Apple iMac 24" (M3)'          }, performer: { full_name: 'Dr. Priya Sharma' }, approver: null },
  { id: 'h-002', event_type: 'status_change',       occurred_at: '2024-08-01T14:15:00Z', reason: 'Reported missing during annual audit',  asset: { id: 'ast-008', asset_tag: 'SPIT/COMP/2020/00089', name: 'Lenovo ThinkCentre Desktop'   }, performer: { full_name: 'Rahul Mehta'       }, approver: null },
  { id: 'h-003', event_type: 'transfer_approved',   occurred_at: '2024-07-25T09:00:00Z', reason: 'Lab reorganisation — Sem 1 2024',      asset: { id: 'ast-001', asset_tag: 'SPIT/COMP/2023/00001', name: 'Dell Optiplex 7090 Desktop'   }, performer: { full_name: 'Rahul Mehta'       }, approver: { full_name: 'Dr. Priya Sharma' } },
  { id: 'h-004', event_type: 'deletion_approved',   occurred_at: '2024-06-10T11:00:00Z', reason: 'Beyond repair — compressor failure',   asset: { id: 'ast-015', asset_tag: 'SPIT/ACND/2021/00014', name: 'LG 2 Ton Split AC'            }, performer: { full_name: 'Sneha Patil'       }, approver: { full_name: 'Dr. Priya Sharma' } },
  { id: 'h-005', event_type: 'status_change',       occurred_at: '2024-07-15T08:30:00Z', reason: 'Paper jam — service scheduled',        asset: { id: 'ast-003', asset_tag: 'SPIT/COMP/2022/00047', name: 'HP LaserJet Pro Printer'      }, performer: { full_name: 'Rahul Mehta'       }, approver: null },
  { id: 'h-006', event_type: 'addition_approved',   occurred_at: '2024-03-01T10:00:00Z', reason: 'Conference room upgrade 2024',         asset: { id: 'ast-014', asset_tag: 'SPIT/FURN/2024/00006', name: 'Conference Table (10-seater)' }, performer: { full_name: 'Sneha Patil'       }, approver: { full_name: 'Dr. Priya Sharma' } },
  { id: 'h-007', event_type: 'photo_uploaded',      occurred_at: '2024-07-20T16:00:00Z', reason: null,                                   asset: { id: 'ast-012', asset_tag: 'SPIT/DISP/2021/00005', name: 'Projector — Epson EB-X51'     }, performer: { full_name: 'Dr. Priya Sharma' }, approver: null },
  { id: 'h-008', event_type: 'edit_approved',       occurred_at: '2024-05-05T13:00:00Z', reason: 'Corrected acquisition year from 2021', asset: { id: 'ast-006', asset_tag: 'SPIT/ACND/2022/00003', name: 'Daikin 1.5 Ton Split AC'      }, performer: { full_name: 'Rahul Mehta'       }, approver: { full_name: 'Dr. Priya Sharma' } },
  { id: 'h-009', event_type: 'addition_approved',   occurred_at: '2024-01-10T09:00:00Z', reason: 'Annual procurement 2023-24',           asset: { id: 'ast-007', asset_tag: 'SPIT/DISP/2023/00011', name: 'Smart Board 85"'              }, performer: { full_name: 'Sneha Patil'       }, approver: { full_name: 'Dr. Priya Sharma' } },
  { id: 'h-010', event_type: 'transfer_rejected',   occurred_at: '2024-04-12T10:00:00Z', reason: 'Receiving room at full capacity',      asset: { id: 'ast-004', asset_tag: 'SPIT/FURN/2021/00012', name: 'Student Desk (Single Seater)' }, performer: { full_name: 'Rahul Mehta'       }, approver: { full_name: 'Dr. Priya Sharma' } },
];

export const DEMO_PENDING_REQUESTS = [
  { id: 'req-001', type: 'transfer', status: 'pending', reason: 'Moving to new 5th floor lab for semester reorganisation', created_at: '2024-08-25T10:00:00Z', asset: { id: 'ast-002', asset_tag: 'SPIT/COMP/2023/00002', name: 'Dell Optiplex 7090 Desktop'   }, requester: { id: 'mgr-001', full_name: 'Rahul Mehta'  }, reviewer: null, reviewed_at: null, new_values: { to_room_id: 'rm-009' }, old_values: {}, rejection_reason: null },
  { id: 'req-002', type: 'addition', status: 'pending', reason: 'New batch of chairs for Seminar Hall — 50 units Q3 2024',  created_at: '2024-08-23T14:30:00Z', asset: null,                                                                                    requester: { id: 'mgr-002', full_name: 'Sneha Patil'  }, reviewer: null, reviewed_at: null, new_values: { name: 'Auditorium Chair', room_id: 'rm-007', status: 'active' }, old_values: {}, rejection_reason: null },
  { id: 'req-003', type: 'edit',     status: 'pending', reason: 'Correcting description — lamp was replaced in June 2024',  created_at: '2024-08-22T09:15:00Z', asset: { id: 'ast-012', asset_tag: 'SPIT/DISP/2021/00005', name: 'Projector — Epson EB-X51' }, requester: { id: 'mgr-001', full_name: 'Rahul Mehta'  }, reviewer: null, reviewed_at: null, new_values: { description: 'Lamp replaced June 2024' }, old_values: { description: '3800 Lumens, XGA, HDMI' }, rejection_reason: null },
];

export const DEMO_STATS = {
  totalAssets:      1036,
  activeAssets:     948,
  totalRooms:       87,
  totalBuildings:   1,
  pendingApprovals: 3,
  recentTransfers:  12,
};
