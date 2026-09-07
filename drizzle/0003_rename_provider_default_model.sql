UPDATE `providers`
SET `configuration` = json_set(
	`configuration`,
	'$.defaultModel',
	CASE
		WHEN json_type(`configuration`, '$.primaryModel') = 'text'
			THEN json_extract(`configuration`, '$.primaryModel')
		WHEN json_type(`configuration`, '$.primaryModel.model') = 'text'
			THEN json_extract(`configuration`, '$.primaryModel.model')
	END
)
WHERE json_type(`configuration`, '$.defaultModel') IS NULL
	AND (
		json_type(`configuration`, '$.primaryModel') = 'text'
		OR json_type(`configuration`, '$.primaryModel.model') = 'text'
	);
--> statement-breakpoint
UPDATE `providers`
SET `configuration` = json_remove(`configuration`, '$.primaryModel')
WHERE json_type(`configuration`, '$.defaultModel') = 'text'
	AND json_type(`configuration`, '$.primaryModel') IS NOT NULL;
