CREATE OR REPLACE FUNCTION experiments.deterministic_uniform_random(p_seed_string TEXT)
RETURNS DOUBLE PRECISION
LANGUAGE sql
STRICT
IMMUTABLE
PARALLEL SAFE
AS $$
    SELECT (
        ('x' || substr(md5(p_seed_string), 1, 8))::bit(32)::bigint & 2147483647
    )::double precision / 2147483647::double precision;
$$;
REVOKE EXECUTE ON ROUTINE experiments.deterministic_uniform_random(TEXT) FROM PUBLIC;
GRANT EXECUTE ON ROUTINE experiments.deterministic_uniform_random(TEXT) TO service_role;