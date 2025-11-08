from __future__ import annotations

def get_cookie_from(response):
    cookie = response.headers.get("set-cookie") or response.headers.get("Set-Cookie")
    assert cookie, "Missing Set-Cookie header"
    # only need the cookie name=value; strip attributes
    return cookie.split(";")[0]
