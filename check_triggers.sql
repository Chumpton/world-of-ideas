select event_object_schema as table_schema,
       event_object_table as table_name,
       trigger_name,
       event_manipulation as event,
       action_statement as definition,
       action_timing as timing
from information_schema.triggers
where event_object_table = 'users'
order by table_name, trigger_name;
