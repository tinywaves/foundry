-- Custom SQL migration file, put your code below! --
UPDATE `fetch_jobs`
SET `credits_used` = CASE
  WHEN json_type(`raw_response_json`, '$.creditsUsed') IN ('integer', 'real')
    AND json_extract(`raw_response_json`, '$.creditsUsed') >= 0
    AND json_extract(`raw_response_json`, '$.creditsUsed') <= 9007199254740991
    AND CAST(json_extract(`raw_response_json`, '$.creditsUsed') AS INTEGER)
      = json_extract(`raw_response_json`, '$.creditsUsed')
  THEN CAST(json_extract(`raw_response_json`, '$.creditsUsed') AS INTEGER)
  ELSE `credits_used`
END
WHERE `status` = 'succeeded'
  AND `credits_used` IS NULL
  AND `raw_response_json` IS NOT NULL
  AND json_valid(`raw_response_json`);
