export interface DiagramTypeInfo {
  id: string;
  label: string;
}

export interface TemplateDefinition {
  id: string;           // unique, e.g. "flowchart-login-flow"
  diagramType: string;  // matches DIAGRAM_TYPES[].id
  name: string;         // display name
  description: string;  // one-line description
  source: string;       // full Mermaid source
}

export const DIAGRAM_TYPES: DiagramTypeInfo[] = [
  { id: "flowchart",       label: "Flowchart" },
  { id: "graph",           label: "Graph" },
  { id: "sequenceDiagram", label: "Sequence Diagram" },
  { id: "classDiagram",    label: "Class Diagram" },
  { id: "stateDiagram-v2", label: "State Diagram" },
  { id: "erDiagram",       label: "Entity Relationship" },
  { id: "gantt",           label: "Gantt Chart" },
  { id: "pie",             label: "Pie Chart" },
  { id: "gitGraph",        label: "Git Graph" },
  { id: "mindmap",         label: "Mindmap" },
  { id: "timeline",        label: "Timeline" },
  { id: "quadrantChart",   label: "Quadrant Chart" },
  { id: "xychart-beta",    label: "XY Chart" },
  { id: "journey",         label: "User Journey" },
];

export const TEMPLATE_LIBRARY: TemplateDefinition[] = [
  // Flowchart (4)
  {
    id: "flowchart-login",
    diagramType: "flowchart",
    name: "Login Flow",
    description: "User authentication with success/failure paths",
    source: `flowchart TD
    A([Start]) --> B[/Enter credentials/]
    B --> C{Valid?}
    C -->|Yes| D[Load user profile]
    C -->|No| E{Attempts < 3?}
    D --> F[Redirect to dashboard]
    E -->|Yes| G[Show error message]
    E -->|No| H[Lock account]
    G --> B
    H --> I([End])
    F --> I
`,
  },
  {
    id: "flowchart-cicd",
    diagramType: "flowchart",
    name: "CI/CD Pipeline",
    description: "Continuous integration and deployment workflow",
    source: `flowchart LR
    A([Push]) --> B[Run lint]
    B --> C[Run tests]
    C --> D{Tests pass?}
    D -->|No| E[Notify developer]
    D -->|Yes| F[Build image]
    F --> G[Push to registry]
    G --> H{Branch?}
    H -->|main| I[Deploy to prod]
    H -->|develop| J[Deploy to staging]
    I --> K([Done])
    J --> K
`,
  },
  {
    id: "flowchart-decision",
    diagramType: "flowchart",
    name: "Decision Tree",
    description: "Multi-branch decision logic",
    source: `flowchart TD
    A[Customer complaint received] --> B{Priority?}
    B -->|High| C[Assign to senior agent]
    B -->|Medium| D[Add to queue]
    B -->|Low| E[Send auto-reply]
    C --> F[Respond within 1 hour]
    D --> G[Respond within 4 hours]
    E --> H{Resolved by FAQ?}
    H -->|Yes| I([Close ticket])
    H -->|No| D
    F --> I
    G --> I
`,
  },
  {
    id: "flowchart-onboarding",
    diagramType: "flowchart",
    name: "User Onboarding",
    description: "New user registration and setup flow",
    source: `flowchart TD
    A([Sign Up]) --> B[Verify email]
    B --> C{Email confirmed?}
    C -->|No| D[Resend email]
    D --> C
    C -->|Yes| E[Create profile]
    E --> F[Select plan]
    F --> G{Free or Paid?}
    G -->|Free| H[Activate free tier]
    G -->|Paid| I[Payment form]
    I --> J{Payment OK?}
    J -->|No| I
    J -->|Yes| K[Activate subscription]
    H --> L[Welcome tour]
    K --> L
    L --> M([Dashboard])
`,
  },

  // Sequence (4)
  {
    id: "sequence-api",
    diagramType: "sequenceDiagram",
    name: "REST API Request",
    description: "Client-server HTTP request/response cycle",
    source: `sequenceDiagram
    participant Browser
    participant API
    participant DB

    Browser->>+API: GET /api/users/42
    API->>+DB: SELECT * FROM users WHERE id=42
    DB-->>-API: User row
    API-->>-Browser: 200 OK { id: 42, name: "Alice" }

    Browser->>+API: PUT /api/users/42
    Note over Browser,API: { name: "Alice Smith" }
    API->>+DB: UPDATE users SET name=? WHERE id=42
    DB-->>-API: 1 row updated
    API-->>-Browser: 200 OK { id: 42, name: "Alice Smith" }
`,
  },
  {
    id: "sequence-oauth",
    diagramType: "sequenceDiagram",
    name: "OAuth 2.0 Flow",
    description: "Authorization code grant with token exchange",
    source: `sequenceDiagram
    participant User
    participant App
    participant AuthServer
    participant ResourceServer

    User->>App: Click "Login with GitHub"
    App->>AuthServer: GET /authorize?client_id=...
    AuthServer->>User: Show consent screen
    User->>AuthServer: Grant permission
    AuthServer->>App: Redirect with code=abc123
    App->>+AuthServer: POST /token (code + secret)
    AuthServer-->>-App: access_token + refresh_token
    App->>+ResourceServer: GET /user (Bearer token)
    ResourceServer-->>-App: User profile
    App->>User: Logged in!
`,
  },
  {
    id: "sequence-microservices",
    diagramType: "sequenceDiagram",
    name: "Microservices",
    description: "Service-to-service communication pattern",
    source: `sequenceDiagram
    participant Client
    participant Gateway
    participant OrderSvc
    participant InventorySvc
    participant PaymentSvc

    Client->>+Gateway: POST /orders
    Gateway->>+OrderSvc: createOrder(items)
    OrderSvc->>+InventorySvc: checkStock(items)
    InventorySvc-->>-OrderSvc: available: true
    OrderSvc->>+PaymentSvc: charge(amount)
    PaymentSvc-->>-OrderSvc: txn_id: xyz
    OrderSvc-->>-Gateway: order_id: 101
    Gateway-->>-Client: 201 Created
`,
  },
  {
    id: "sequence-websocket",
    diagramType: "sequenceDiagram",
    name: "WebSocket Session",
    description: "Real-time bidirectional WebSocket communication",
    source: `sequenceDiagram
    participant Client
    participant Server

    Client->>+Server: HTTP Upgrade: websocket
    Server-->>Client: 101 Switching Protocols
    Note over Client,Server: Connection established

    loop Every 30s
        Client->>Server: ping
        Server-->>Client: pong
    end

    Client->>Server: {"type":"subscribe","room":"chat-1"}
    Server-->>Client: {"type":"joined","room":"chat-1"}
    Client->>Server: {"type":"message","text":"Hello!"}
    Server-->>Client: {"type":"message","from":"Alice","text":"Hello!"}
    Client->>Server: close
    Server-->>-Client: close
`,
  },

  // Class (3)
  {
    id: "class-mvc",
    diagramType: "classDiagram",
    name: "MVC Pattern",
    description: "Model-View-Controller architectural pattern",
    source: `classDiagram
    class Model {
        -data: any
        +getData() any
        +setData(value: any) void
        +notify() void
    }
    class View {
        -element: HTMLElement
        +render(data: any) void
        +bindEvents(controller: Controller) void
    }
    class Controller {
        -model: Model
        -view: View
        +handleInput(event: Event) void
        +updateModel(data: any) void
    }
    Controller --> Model : updates
    Controller --> View : renders
    View --> Controller : notifies
    Model --> View : observes
`,
  },
  {
    id: "class-repository",
    diagramType: "classDiagram",
    name: "Repository Pattern",
    description: "Data access abstraction layer",
    source: `classDiagram
    class IRepository~T~ {
        <<interface>>
        +findById(id: string) T
        +findAll() T[]
        +save(entity: T) T
        +delete(id: string) void
    }
    class UserRepository {
        -db: Database
        +findById(id: string) User
        +findAll() User[]
        +findByEmail(email: string) User
        +save(user: User) User
        +delete(id: string) void
    }
    class User {
        +id: string
        +name: string
        +email: string
        +createdAt: Date
    }
    IRepository <|-- UserRepository
    UserRepository --> User
`,
  },
  {
    id: "class-observer",
    diagramType: "classDiagram",
    name: "Observer Pattern",
    description: "Event-driven publish/subscribe pattern",
    source: `classDiagram
    class EventEmitter {
        <<interface>>
        +on(event: string, fn: Function) void
        +off(event: string, fn: Function) void
        +emit(event: string, data: any) void
    }
    class Store {
        -state: State
        -listeners: Map
        +on(event: string, fn: Function) void
        +off(event: string, fn: Function) void
        +emit(event: string, data: any) void
        +getState() State
        +dispatch(action: Action) void
    }
    class Component {
        -unsubscribe: Function
        +componentDidMount() void
        +componentWillUnmount() void
        +render() void
    }
    EventEmitter <|-- Store
    Component --> Store : subscribes
`,
  },

  // ER Diagram (3)
  {
    id: "er-blog",
    diagramType: "erDiagram",
    name: "Blog Schema",
    description: "Posts, comments, tags, and authors",
    source: `erDiagram
    USER ||--o{ POST : writes
    USER ||--o{ COMMENT : writes
    POST ||--o{ COMMENT : has
    POST }o--o{ TAG : tagged

    USER {
        uuid id PK
        string email UK
        string name
        timestamp created_at
    }
    POST {
        uuid id PK
        uuid author_id FK
        string title
        text content
        string status
        timestamp published_at
    }
    COMMENT {
        uuid id PK
        uuid post_id FK
        uuid author_id FK
        text body
        timestamp created_at
    }
    TAG {
        uuid id PK
        string slug UK
        string name
    }
`,
  },
  {
    id: "er-ecommerce",
    diagramType: "erDiagram",
    name: "E-Commerce",
    description: "Products, orders, customers, and inventory",
    source: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains
    PRODUCT ||--o{ ORDER_ITEM : "ordered in"
    PRODUCT ||--o| INVENTORY : tracks

    CUSTOMER {
        uuid id PK
        string email UK
        string name
        string address
    }
    ORDER {
        uuid id PK
        uuid customer_id FK
        decimal total
        string status
        timestamp placed_at
    }
    ORDER_ITEM {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        int quantity
        decimal unit_price
    }
    PRODUCT {
        uuid id PK
        string sku UK
        string name
        decimal price
    }
    INVENTORY {
        uuid product_id FK
        int quantity
        timestamp updated_at
    }
`,
  },
  {
    id: "er-auth",
    diagramType: "erDiagram",
    name: "User & Auth",
    description: "Users, sessions, roles, and permissions",
    source: `erDiagram
    USER ||--o{ SESSION : has
    USER }o--o{ ROLE : "assigned"
    ROLE }o--o{ PERMISSION : grants

    USER {
        uuid id PK
        string email UK
        string password_hash
        boolean active
        timestamp created_at
    }
    SESSION {
        uuid id PK
        uuid user_id FK
        string token UK
        timestamp expires_at
        string ip_address
    }
    ROLE {
        uuid id PK
        string name UK
        string description
    }
    PERMISSION {
        uuid id PK
        string resource
        string action
    }
`,
  },

  // Gantt (2)
  {
    id: "gantt-sprint",
    diagramType: "gantt",
    name: "Sprint Plan",
    description: "Two-week agile sprint schedule",
    source: `gantt
    title Sprint 12 — March 2026
    dateFormat YYYY-MM-DD
    excludes weekends

    section Planning
        Sprint planning       :done, 2026-03-02, 1d
        Backlog grooming      :done, 2026-03-02, 1d

    section Development
        User auth API         :done, 2026-03-03, 3d
        Dashboard UI          :active, 2026-03-06, 4d
        Notification service  :2026-03-10, 3d

    section QA
        Integration tests     :2026-03-12, 2d
        Bug fixes             :2026-03-13, 1d

    section Release
        Deploy to staging     :milestone, 2026-03-14, 0d
        Deploy to production  :milestone, 2026-03-15, 0d
`,
  },
  {
    id: "gantt-project",
    diagramType: "gantt",
    name: "Project Timeline",
    description: "Multi-phase project with milestones",
    source: `gantt
    title Product Launch Timeline
    dateFormat YYYY-MM-DD

    section Discovery
        Stakeholder interviews :done, 2026-01-05, 10d
        Market research        :done, 2026-01-12, 7d
        Requirements doc       :done, 2026-01-19, 5d

    section Design
        Wireframes             :done, 2026-01-26, 7d
        UI mockups             :done, 2026-02-02, 10d
        Design review          :milestone, 2026-02-12, 0d

    section Build
        Frontend               :active, 2026-02-13, 21d
        Backend API            :active, 2026-02-13, 14d
        Integration            :2026-03-02, 7d

    section Launch
        Beta testing           :2026-03-09, 10d
        Public launch          :milestone, 2026-03-19, 0d
`,
  },

  // Pie (2)
  {
    id: "pie-market",
    diagramType: "pie",
    name: "Market Share",
    description: "Browser market share distribution",
    source: `pie title Browser Market Share 2026
    "Chrome"  : 65.2
    "Safari"  : 19.1
    "Edge"    : 4.5
    "Firefox" : 3.8
    "Other"   : 7.4
`,
  },
  {
    id: "pie-budget",
    diagramType: "pie",
    name: "Budget Split",
    description: "Project budget allocation by category",
    source: `pie title Project Budget Allocation
    "Engineering"  : 45
    "Design"       : 15
    "Marketing"    : 20
    "Operations"   : 10
    "Legal"        : 5
    "Contingency"  : 5
`,
  },

  // State Diagram (3)
  {
    id: "state-traffic",
    diagramType: "stateDiagram-v2",
    name: "Traffic Light",
    description: "Traffic light state machine",
    source: `stateDiagram-v2
    [*] --> Red

    Red --> Green : timer (60s)
    Green --> Yellow : timer (45s)
    Yellow --> Red : timer (5s)

    state Red {
        [*] --> Solid
        Solid --> Flashing : night mode
        Flashing --> Solid : day mode
    }
`,
  },
  {
    id: "state-order",
    diagramType: "stateDiagram-v2",
    name: "Order Lifecycle",
    description: "E-commerce order state machine",
    source: `stateDiagram-v2
    [*] --> Pending

    Pending --> Confirmed : payment_ok
    Pending --> Cancelled : payment_failed
    Confirmed --> Processing : warehouse_ack
    Processing --> Shipped : dispatched
    Shipped --> Delivered : scan_delivered
    Shipped --> ReturnRequested : customer_return
    Delivered --> ReturnRequested : within_30_days
    ReturnRequested --> Refunded : return_received
    Cancelled --> [*]
    Delivered --> [*]
    Refunded --> [*]
`,
  },
  {
    id: "state-auth",
    diagramType: "stateDiagram-v2",
    name: "Auth Session",
    description: "User authentication session lifecycle",
    source: `stateDiagram-v2
    [*] --> LoggedOut

    LoggedOut --> Authenticating : login_attempt
    Authenticating --> LoggedIn : credentials_valid
    Authenticating --> LoggedOut : credentials_invalid

    state LoggedIn {
        [*] --> Active
        Active --> Idle : no_activity (10m)
        Idle --> Active : user_action
        Idle --> SessionExpired : timeout (30m)
    }

    LoggedIn --> LoggedOut : logout
    SessionExpired --> LoggedOut : redirect
    SessionExpired --> [*]
`,
  },

  // Git Graph (1)
  {
    id: "gitgraph-feature",
    diagramType: "gitGraph",
    name: "Feature Branch",
    description: "Git feature branch workflow",
    source: `gitGraph
    commit id: "Initial commit"
    commit id: "Add base structure"

    branch feature/auth
    checkout feature/auth
    commit id: "Add login endpoint"
    commit id: "Add JWT middleware"
    commit id: "Add tests"

    checkout main
    branch hotfix/security
    checkout hotfix/security
    commit id: "Fix XSS vulnerability"
    checkout main
    merge hotfix/security id: "Merge hotfix"

    checkout feature/auth
    merge main id: "Sync with main"
    commit id: "Address review comments"

    checkout main
    merge feature/auth id: "Merge feature/auth"
    commit id: "Bump version to 1.1.0"
`,
  },

  // Mindmap (1)
  {
    id: "mindmap-project",
    diagramType: "mindmap",
    name: "Project Plan",
    description: "Project planning mind map",
    source: `mindmap
    root((Product Launch))
        Research
            User interviews
            Competitor analysis
            Market sizing
        Design
            Wireframes
            Prototypes
            Design system
        Engineering
            Frontend
                Components
                State management
            Backend
                API design
                Database
            DevOps
                CI/CD
                Monitoring
        Go-to-market
            Marketing site
            Docs
            Launch campaign
`,
  },

  // Timeline (1)
  {
    id: "timeline-product",
    diagramType: "timeline",
    name: "Product History",
    description: "Product version release history",
    source: `timeline
    title Product Version History
    2022 : v0.1 Alpha
         : Internal testing
    2023 : v1.0 Launch
         : v1.1 Performance improvements
         : v1.2 Mobile support
    2024 : v2.0 Complete rewrite
         : v2.1 Plugin system
         : v2.2 Dark mode
    2025 : v3.0 AI features
         : v3.1 Collaboration
    2026 : v4.0 Enterprise tier
`,
  },
];

export const TEMPLATES: Record<string, string> = {
  flowchart: `flowchart TD
    A[Start] --> B{Decision?}
    B -->|Yes| C[Do it]
    B -->|No| D[End]
`,
  graph: `graph LR
    A[Node A] --> B[Node B]
    B --> C[Node C]
    A --> C
`,
  sequenceDiagram: `sequenceDiagram
    participant Alice
    participant Bob
    Alice->>Bob: Hello Bob!
    Bob-->>Alice: Hi Alice!
    Alice->>Bob: How are you?
    Bob-->>Alice: I am good, thanks!
`,
  classDiagram: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
    }
    class Dog {
        +fetch() void
    }
    class Cat {
        +purr() void
    }
    Animal <|-- Dog
    Animal <|-- Cat
`,
  "stateDiagram-v2": `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : start
    Processing --> Done : complete
    Processing --> Error : fail
    Error --> Idle : reset
    Done --> [*]
`,
  erDiagram: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    CUSTOMER {
        string name
        string email
        string phone
    }
    ORDER {
        int id
        date placed
        string status
    }
    LINE_ITEM {
        int quantity
        float price
    }
`,
  gantt: `gantt
    title My Project
    dateFormat YYYY-MM-DD
    section Planning
        Requirements :done, 2024-01-01, 7d
        Design       :done, 2024-01-08, 5d
    section Development
        Backend  :active, 2024-01-13, 10d
        Frontend :        2024-01-20, 10d
    section Launch
        Testing  :        2024-01-30, 5d
        Deploy   :        2024-02-04, 2d
`,
  pie: `pie title Browser Market Share
    "Chrome"  : 65
    "Safari"  : 19
    "Firefox" : 4
    "Edge"    : 4
    "Other"   : 8
`,
  gitGraph: `gitGraph
    commit
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit
`,
  mindmap: `mindmap
    root((Project))
        Planning
            Requirements
            Timeline
        Development
            Frontend
            Backend
            Database
        Launch
            Testing
            Deploy
`,
  timeline: `timeline
    title History of Social Media
    2002 : LinkedIn
    2004 : Facebook
         : Flickr
    2005 : YouTube
    2006 : Twitter
    2010 : Instagram
    2011 : Snapchat
`,
  quadrantChart: `quadrantChart
    title Feature Priority Matrix
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 Quick wins
    quadrant-2 Major projects
    quadrant-3 Fill-ins
    quadrant-4 Thankless tasks
    Feature A: [0.2, 0.8]
    Feature B: [0.7, 0.7]
    Feature C: [0.3, 0.3]
    Feature D: [0.8, 0.2]
`,
  "xychart-beta": `xychart-beta
    title "Monthly Revenue"
    x-axis [Jan, Feb, Mar, Apr, May, Jun]
    y-axis "Revenue ($K)" 0 --> 100
    bar [30, 45, 60, 55, 70, 85]
    line [30, 45, 60, 55, 70, 85]
`,
  journey: `journey
    title My Working Day
    section Morning
        Wake up:  5: Me
        Breakfast: 4: Me
        Commute: 2: Me
    section Work
        Code review: 3: Me, Team
        Write features: 5: Me
        Meetings: 1: Me, Team
    section Evening
        Gym: 4: Me
        Dinner: 5: Me
`,
};

export function getTemplate(type: string): string {
  return TEMPLATE_LIBRARY.find(t => t.diagramType === type)?.source ?? TEMPLATES[type] ?? `${type}\n`;
}

export function getTemplateById(id: string): TemplateDefinition | undefined {
  return TEMPLATE_LIBRARY.find(t => t.id === id);
}
