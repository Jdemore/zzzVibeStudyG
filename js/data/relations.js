// Normalization workshop relations.
// attrs: attribute names in display order. pk: primary key attributes.
// fds: [determinant[], dependent[], type]. dependent 'ALL' means every other attribute.
//   type: 'key' candidate key, 'pd' partial, 'td' transitive, 'nsk' non-superkey (violates BCNF only).
// nf: highest normal form the relation is in as given ('1NF' | '2NF' | '3NF').
// steps: one per normal form reached. fd: index of the dependency removed. fk: attribute left behind as the foreign key.
//   out: resulting relations as [name, [[attribute, marks]]] where marks is '' | 'p' | 'f' | 'pf'.

const rel = (name, list) => [name, list.split(' ').map(a => {
  const [n, m = ''] = a.split(':');
  return [n, m];
})];

export const relations = [
  { id: 'accidents', name: 'DeliveryVehicleAccidents', src: 'Fall 2023 practicum, Q2d',
    attrs: ['AutoID', 'DriverID', 'AccidentDate', 'DriverLastname', 'TypeID', 'hasInjury', 'TypeDesc'],
    pk: ['AutoID', 'DriverID', 'AccidentDate'],
    fds: [
      [['AutoID', 'DriverID', 'AccidentDate'], 'ALL', 'key'],
      [['DriverID'], ['DriverLastname'], 'pd'],
      [['TypeID'], ['TypeDesc'], 'td'],
    ],
    nf: '1NF',
    steps: [
      { nf: '2NF', fd: 1, fk: 'DriverID', out: [
        rel('DeliveryVehicleAccidents', 'AutoID:p DriverID:pf AccidentDate:p TypeID hasInjury TypeDesc'),
        rel('Driver', 'DriverID:p DriverLastname')],
        note: 'Only the partial dependency moves. DriverID stays in the original, still part of the primary key and now also a foreign key. The transitive dependency is still there.' },
      { nf: '3NF', fd: 2, fk: 'TypeID', out: [
        rel('DeliveryVehicleAccidents', 'AutoID:p DriverID:pf AccidentDate:p TypeID:f hasInjury'),
        rel('Driver', 'DriverID:p DriverLastname'),
        rel('AccidentType', 'TypeID:p TypeDesc')],
        note: 'Start from the 2NF answer. TypeID stays behind as a foreign key to AccidentType.' },
    ] },
  { id: 'cities', name: 'CitiesInStates', src: 'Summer 2021 practicum, Q2d',
    attrs: ['State', 'City', 'Altitude', 'Population', 'MayorID', 'MayorName', 'StateCapitolCity'],
    pk: ['State', 'City'],
    fds: [
      [['State', 'City'], 'ALL', 'key'],
      [['MayorID'], ['MayorName'], 'td'],
      [['State'], ['StateCapitolCity'], 'pd'],
    ],
    nf: '1NF',
    steps: [
      { nf: '2NF', fd: 2, fk: 'State', out: [
        rel('City', 'State:pf City:p Altitude Population MayorID MayorName'),
        rel('StateCapitol', 'State:p StateCapitolCity')],
        note: 'A state has one capital whatever the city, so StateCapitolCity depends on State alone.' },
      { nf: '3NF', fd: 1, fk: 'MayorID', out: [
        rel('City', 'State:pf City:p Altitude Population MayorID:f'),
        rel('StateCapitol', 'State:p StateCapitolCity'),
        rel('CityMayor', 'MayorID:p MayorName')],
        note: 'MayorID determines MayorName, and neither is part of a key.' },
    ] },
  { id: 'project', name: 'Client_Project', src: 'Fall 2020 practicum, Q2d',
    attrs: ['ProjectID', 'ClientID', 'ProjectName', 'StartDate', 'Duration_wk', 'BudgetID', 'TotalBudget'],
    pk: ['ProjectID', 'ClientID'],
    fds: [
      [['ProjectID', 'ClientID'], 'ALL', 'key'],
      [['ProjectID'], ['ProjectName'], 'pd'],
      [['BudgetID'], ['TotalBudget'], 'td'],
    ],
    nf: '1NF',
    steps: [
      { nf: '2NF', fd: 1, fk: 'ProjectID', out: [
        rel('Client_Project', 'ProjectID:pf ClientID:p StartDate Duration_wk BudgetID TotalBudget'),
        rel('Project', 'ProjectID:p ProjectName')],
        note: 'The key leaves the new relations unnamed; Project and Budget are names chosen here.' },
      { nf: '3NF', fd: 2, fk: 'BudgetID', out: [
        rel('Client_Project', 'ProjectID:pf ClientID:p StartDate Duration_wk BudgetID:f'),
        rel('Project', 'ProjectID:p ProjectName'),
        rel('Budget', 'BudgetID:p TotalBudget')],
        note: 'Each stage was worth 6 points. Removing the wrong dependency at a stage cost up to 3.' },
    ] },
  { id: 'shipments', name: 'SHIPMENTS', src: 'Lecture, 2NF example',
    attrs: ['line_id', 'supplier_id', 'quantity_shipped', 'shipper', 'tracking_num', 'shipdate', 'supplier_name'],
    pk: ['line_id', 'supplier_id'],
    fds: [
      [['line_id', 'supplier_id'], 'ALL', 'key'],
      [['supplier_id'], ['supplier_name'], 'pd'],
    ],
    nf: '1NF',
    steps: [
      { nf: '2NF', fd: 1, fk: 'supplier_id', out: [
        rel('SHIPMENTS', 'line_id:p supplier_id:pf quantity_shipped shipper tracking_num shipdate'),
        rel('SUPPLIERS', 'supplier_id:p supplier_name')],
        note: 'With no other problem dependency left, the result is also in 3NF and BCNF.' },
    ] },
  { id: 'orderitems', name: 'ORDER_ITEMS', src: 'Lecture, 3NF example',
    attrs: ['line_id', 'order_id', 'line_item_id', 'product_id', 'award_points', 'unit_price', 'quantity'],
    pk: ['line_id'],
    fds: [
      [['line_id'], 'ALL', 'key'],
      [['order_id', 'line_item_id'], 'ALL', 'key'],
      [['order_id', 'product_id'], 'ALL', 'key'],
      [['unit_price'], ['award_points'], 'td'],
    ],
    nf: '2NF',
    steps: [
      { nf: '3NF', fd: 3, fk: 'unit_price', out: [
        rel('ORDER_ITEMS', 'line_id:p order_id line_item_id product_id unit_price:f quantity'),
        rel('PRICE_AWARDS', 'unit_price:p award_points')],
        note: 'Three candidate keys make order_id, line_item_id, product_id and line_id prime. unit_price and award_points are in none of them, and points are derived from price, so the dependency passes both of the lecture’s tests.' },
    ] },
  { id: 'newfac', name: 'NEWFAC', src: 'Lecture and textbook, BCNF example',
    attrs: ['fac_name', 'dept', 'office', 'rank', 'date_hired'],
    pk: ['fac_name', 'dept'],
    fds: [
      [['fac_name', 'dept'], 'ALL', 'key'],
      [['fac_name', 'office'], 'ALL', 'key'],
      [['office'], ['dept'], 'nsk'],
    ],
    nf: '3NF',
    steps: [
      { nf: 'BCNF', fd: 2, fk: 'office', out: [
        rel('NEWFAC', 'fac_name:p office:pf rank date_hired'),
        rel('DEPTOFFICE', 'office:p dept')],
        note: 'Removing dept destroys the original primary key, so the surviving candidate key {fac_name, office} is promoted. The dependency {fac_name, dept} → {office, rank, date_hired} can no longer be enforced: BCNF does not always preserve dependencies.' },
    ] },
  { id: 'work', name: 'Work', src: 'Textbook, section 6.5.5',
    attrs: ['projName', 'empId', 'projMgr', 'budget', 'startDate', 'hours', 'rating', 'empName', 'salary', 'empDept', 'empMgr'],
    pk: ['projName', 'empId'],
    fds: [
      [['projName', 'empId'], 'ALL', 'key'],
      [['projName'], ['projMgr', 'budget', 'startDate'], 'pd'],
      [['empId'], ['empName', 'salary', 'empDept', 'empMgr'], 'pd'],
      [['empDept'], ['empMgr'], 'td'],
    ],
    nf: '1NF',
    steps: [
      { nf: '2NF', fd: 1, fk: 'projName', also: 2, out: [
        rel('Work1', 'projName:pf empId:pf hours rating'),
        rel('Proj', 'projName:p projMgr budget startDate'),
        rel('Emp', 'empId:p empName salary empDept empMgr')],
        note: 'There are two partial dependencies and both must go for 2NF: projName → ... and empId → .... Work1 is kept even though it is small, because it connects projects to employees.' },
      { nf: '3NF', fd: 3, fk: 'empDept', out: [
        rel('Work1', 'projName:pf empId:pf hours rating'),
        rel('Proj', 'projName:p projMgr budget startDate'),
        rel('Emp1', 'empId:p empName salary empDept:f'),
        rel('Dept', 'empDept:p empMgr')],
        note: 'Each department has one manager, so empDept → empMgr inside Emp. The result is also in BCNF.' },
    ] },
  { id: 'newclass', name: 'NewClass', src: 'Textbook, section 6.5.2',
    attrs: ['classNo', 'stuId', 'stuLastName', 'facId', 'schedule', 'room', 'grade'],
    pk: ['classNo', 'stuId'],
    fds: [
      [['classNo', 'stuId'], 'ALL', 'key'],
      [['classNo'], ['facId', 'schedule', 'room'], 'pd'],
      [['stuId'], ['stuLastName'], 'pd'],
    ],
    nf: '1NF',
    steps: [
      { nf: '2NF', fd: 1, fk: 'classNo', also: 2, out: [
        rel('Register', 'classNo:pf stuId:pf grade'),
        rel('Class2', 'classNo:p facId schedule room'),
        rel('Stu', 'stuId:p stuLastName')],
        note: 'Both partial dependencies go. Only grade depends on the whole key. The update, insertion and deletion anomalies of NewClass are gone.' },
    ] },
  { id: 'newstudent', name: 'NewStudent', src: 'Textbook, section 6.5.3',
    attrs: ['stuId', 'lastName', 'major', 'credits', 'status'],
    pk: ['stuId'],
    fds: [
      [['stuId'], 'ALL', 'key'],
      [['credits'], ['status'], 'td'],
    ],
    nf: '2NF',
    steps: [
      { nf: '3NF', fd: 1, fk: 'credits', out: [
        rel('NewStu2', 'stuId:p lastName major credits:f'),
        rel('Stats', 'credits:p status')],
        note: 'The number of credits determines freshman, sophomore, junior or senior status. Several students can share a credits value, so credits is not a key.' },
    ] },
  { id: 'emp', name: 'Emp', src: 'Textbook, section 6.8',
    attrs: ['empId', 'lastName', 'firstName', 'street', 'city', 'state', 'zip'],
    pk: ['empId'],
    fds: [
      [['empId'], 'ALL', 'key'],
      [['zip'], ['city', 'state'], 'td'],
    ],
    nf: '2NF',
    steps: [
      { nf: '3NF', fd: 1, fk: 'zip', out: [
        rel('Emp1', 'empId:p lastName firstName street zip:f'),
        rel('Codes', 'zip:p city state')],
        note: 'This is the textbook’s case for stopping early: every full address would now need a join, so a designer may reasonably leave Emp in 2NF.' },
    ] },
];
