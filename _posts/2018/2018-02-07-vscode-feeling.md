---
layout: post
title:  "vscode feeling"
date:   2018-02-07 17:10:26 +0900
categories: jekyll page
---
I have used vscode for some times, really feel that it is a good editor for a programmer.  
In the past time, may be the emacs is best for me, because of the inside terminal.
Vscode also has the terminal embaded, so vim is naturally can be used.

## UML diagrams

You can render UML diagrams using [Mermaid](https://mermaidjs.github.io/). For example, this will produce a sequence diagram:

```mermaid
sequenceDiagram
Alice ->> Bob: Hello Bob, how are you?
Bob-->>John: How about you John?
Bob--x Alice: I am good thanks!
Bob-x John: I am good thanks!
Note right of John: Bob thinks a long<br/>long time, so long<br/>that the text does<br/>not fit on a row.

Bob-->Alice: Checking with John...
Alice->John: Yes... John, how are you?
```

And this will produce a flow chart:

```mermaid
graph LR
A[Square Rect] -- Link text --> B((Circle))
A --> C(Round Rect)
B --> D{Rhombus}
C --> D

Best regards.
<!--stackedit_data:
eyJoaXN0b3J5IjpbLTY2MTE2MDM3MF19
-->