"""Reading .env values the way a shell would, so lines copied from .env.example keep working."""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from persist import env_value

def test_inline_comment_is_not_part_of_the_value():
    assert env_value("INBOX    # or a Gmail label such as bizzii") == "INBOX"
    assert env_value("       # optional second key, tried when the first is rate limited") == ""

def test_hash_inside_a_value_and_quoted_values_are_kept():
    assert env_value("pa#ss") == "pa#ss"
    assert env_value('"has # inside"') == "has # inside"
    assert env_value("postgresql://u:p@host/db?sslmode=require&channel_binding=require") == "postgresql://u:p@host/db?sslmode=require&channel_binding=require"
