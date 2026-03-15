export interface DiagramTypeInfo {
  id: string;
  label: string;
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
  return TEMPLATES[type] ?? `${type}\n`;
}
