---
layout: page
title: 文章
permalink: /doc/
---

<ul>
  {% for post in site.posts %}
    <li>
      <a href="{{ post.url }}">{{ post.title }}</a> [{{ post.time | date_to_string }}]
    </li>
  {% endfor %}
</ul>
