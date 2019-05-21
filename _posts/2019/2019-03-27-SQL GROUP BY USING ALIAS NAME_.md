---
layout: post
title:  "SQL:GROUP BY USING ALIAS NAME"
date:   2019-03-27 17:10:26 +0900
categories: jekyll page
---
只是好奇的SQL语法。所以如果我有
~~~~
SELECT 
 itemName as ItemName,
 substring(itemName, 1,1) as FirstLetter,
 Count(itemName)
FROM table1
GROUP BY itemName, FirstLetter
~~~~

这是不正确的，因为
~~~~
GROUP BY itemName, FirstLetter 
~~~~

真的应该
~~~~
GROUP BY itemName, substring(itemName, 1,1)
~~~~

但为什么我们不能简单地使用前者为方便？

最佳答案
SQL的实现方式如同按照以下顺序执行查询：
~~~~
> FROM子句
> WHERE子句
> GROUP BY子句
> HAVING子句
> SELECT子句
> ORDER BY子句
~~~~

对于大多数关系数据库系统，此顺序说明哪些名称(列或别名)有效，因为它们必须在上一步中引入。

因此，在Oracle和SQL Server中，不能在SELECT子句中定义的GROUP BY子句中使用术语，因为GROUP BY在SELECT子句之前执行。

但有一些例外：MySQL和Postgres似乎有更多的聪明性，允许它。
