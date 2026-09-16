// ============================================
// PasswordInput — password field with a show/hide button
//
// Typing a password blind is the leading cause of failed sign-ups:
// one invisible typo and the user starts over without understanding
// why. The eye button fixes that.
//
// Used exactly like a plain <input>: same props (value, onChange,
// name, id, placeholder, className).
// ============================================

import React, { useState } from 'react';
import Icon from './Icon';
import './PasswordInput.css';

const PasswordInput = ({
  id,
  name,
  value,
  onChange,
  placeholder,
  className = '',
  autoComplete = 'current-password',
  showLabel = 'Show password',
  hideLabel = 'Hide password',
  ...rest
}) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="pwd">
      <input
        type={visible ? 'text' : 'password'}
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`pwd__input ${className}`}
        autoComplete={autoComplete}
        {...rest}
      />
      <button
        type="button"                    /* never a submit button: it must not validate the form */
        className="pwd__toggle"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? hideLabel : showLabel}
        title={visible ? hideLabel : showLabel}
        tabIndex={-1}                    /* keeps the form's keyboard navigation intact */
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  );
};

export default PasswordInput;
