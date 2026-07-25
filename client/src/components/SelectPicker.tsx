import Select from 'react-select';

export function SelectPicker({
    options,
    onSelect,
    currentOption
}: {
    options:{ value: string | number, label: string }[],
    onSelect: any, currentOption: string | number
}) {
    return <div className="selectpicker-containter">
        <Select
            options={options}
            onChange={(selectedOption) => onSelect(selectedOption?.value!)}
            value={options.find((option) => option.value === currentOption) || null}
            menuPlacement="auto"
            classNamePrefix="selectpicker"
            theme={(theme) => ({
                ...theme,
                colors: {
                    ...theme.colors,
                    primary: 'var(--primary-text-color)',
                }
            })}
            isSearchable={false}
        />
    </div>
}