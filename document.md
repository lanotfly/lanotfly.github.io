---
layout: page
title: Article
permalink: /doc/
---

<ul>
  {% for post in site.posts %}
    <li>
      <a href="{{ post.url }}">{{ post.title }}</a> [{{ post.date }}]
    </li>
  {% endfor %}
</ul>
