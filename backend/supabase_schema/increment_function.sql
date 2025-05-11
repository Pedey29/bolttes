-- Create a generic increment function for updating counters safely
CREATE OR REPLACE FUNCTION increment(
  table_name text,
  column_name text,
  amount integer,
  row_id uuid
) RETURNS integer AS $$
DECLARE
  new_value integer;
BEGIN
  EXECUTE format('
    UPDATE %I
    SET %I = %I + $1
    WHERE id = $2
    RETURNING %I;
  ', table_name, column_name, column_name, column_name)
  INTO new_value
  USING amount, row_id;
  
  RETURN new_value;
END;
$$ LANGUAGE plpgsql;
