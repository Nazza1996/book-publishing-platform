import Select from 'react-select';

export function SelectPicker({
    options,
    onSelect,
    currentOption,
    width
}: {
    options:{ value: string | number, label: string }[],
    onSelect: any,
    currentOption: string | number,
    width?: string | number
}) {
    return <div className="selectpicker-containter" style={{ width: width }}>
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